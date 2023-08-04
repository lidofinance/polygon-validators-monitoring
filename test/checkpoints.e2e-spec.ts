import { createMock } from '@golevelup/ts-jest';
import {
  FallbackProviderModule,
  SimpleFallbackJsonRpcBatchProvider,
} from '@lido-nestjs/execution';
import { LoggerModule, nullTransport } from '@lido-nestjs/logger';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CheckpointsModule, CheckpointsService } from 'checkpoints';
import { ConfigModule, ConfigService } from 'common/config';
import {
  STAKE_MANAGER_TOKEN,
  StakeManager,
  StakeManagerModule,
  ValidatorShare__factory,
} from 'contracts';
import { NewHeaderBlockEvent } from 'contracts/generated/RootChain';
import { Checkpoint } from 'storage/entities';
import { ACTIVE_SET_LIMIT, ValidatorsModule } from 'validators';
import { DRY_RUN_WINDOW } from 'worker';

const stMATIC = '0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599';
const EVENT_PROCESSING_TIMEOUT = 120_000;

const DataSourceMockProvider = {
  provide: getDataSourceToken(),
  useValue: createMock<DataSource>({
    entityMetadatas: {
      // `find` used to build repositories providers
      // triggered by forFeature call
      find: () => {
        return;
      },
    } as any,
  }),
};

const TypeOrmStub = {
  global: true, // crucial for DI to work
  module: TypeOrmModule,
  providers: [DataSourceMockProvider],
  exports: [DataSourceMockProvider],
};

describe('CheckpointsService', () => {
  let elRPCProvider: SimpleFallbackJsonRpcBatchProvider;
  let checkpointsService: CheckpointsService;
  let stakeManager: StakeManager;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [],
      imports: [
        LoggerModule.forRoot({ transports: [nullTransport()] }),
        FallbackProviderModule.forRoot({
          network: +process.env['CHAIN_ID'],
          urls: [process.env['RPC_URL']],
        }),
        StakeManagerModule.forRootAsync({
          inject: [SimpleFallbackJsonRpcBatchProvider],
          async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
            return { provider };
          },
        }),
        CheckpointsModule,
        ValidatorsModule,
        TypeOrmStub,
        {
          module: ConfigModule,
          providers: [
            {
              provide: ConfigService,
              useValue: {
                get: (key: string) => {
                  switch (key) {
                    case 'DELEGATORS':
                      return [stMATIC];
                    case 'CHAIN_ID':
                      return 1;
                  }
                },
              },
            },
          ],
        },
      ],
    }).compile();

    elRPCProvider = moduleRef.get(SimpleFallbackJsonRpcBatchProvider);
    checkpointsService = moduleRef.get(CheckpointsService);
    stakeManager = moduleRef.get(STAKE_MANAGER_TOKEN);
  });

  async function testCheckpointIsValid(
    event: NewHeaderBlockEvent,
  ): Promise<Checkpoint> {
    const checkpoint = await checkpointsService.processCheckpointEvent(event);
    expect(checkpoint.duties.length).toBeLessThanOrEqual(ACTIVE_SET_LIMIT);
    const duties = checkpoint.duties.filter((d) => d.isTracked);
    expect(duties.length).toBeGreaterThan(0);
    return checkpoint;
  }

  describe('process checkpoint', () => {
    let event: NewHeaderBlockEvent;

    it('it should find a checkpoint within DRY_RUN_WINDOW interval', async () => {
      const block = await elRPCProvider.getBlock('latest');
      event = (
        await checkpointsService.getCheckpointEvents(
          block.number - DRY_RUN_WINDOW,
          block.number,
        )
      ).pop();
      expect(event).toBeDefined();
    });

    it(
      'should process the latest checkpoint',
      async () => {
        await testCheckpointIsValid(event);
      },
      EVENT_PROCESSING_TIMEOUT,
    );
  });

  describe('check rewards', () => {
    // If a validator includes a signature in the checkpoint between the twos missed,
    // then the reward should be included in the second missed checkpoint.
    // NB! Make sure no withdraws occured between checkpoints.
    // NB! 1 wei diff tolerance for the moment.
    it.each([
      [16549911, 16550208, 16], // 3% commission
      [16412765, 16413032, 76], // 0% commission
      [16078011, 16078715, 70], // with proposer bonus included
      [16476759, 16477246, 91], // with proposer bonus included
    ])(
      'rewards for including signature should be correct [%#]',
      async (lBlock: number, rBlock: number, validatorId: number) => {
        const events = await checkpointsService.getCheckpointEvents(
          lBlock,
          rBlock,
        );
        expect(events.length).toEqual(3);
        const event = events.at(1);

        const checkpoint = await testCheckpointIsValid(event);
        const reward = checkpoint.rewards.find((r) => r.vId === validatorId);
        expect(reward).toBeDefined();

        const before = await stakeManager.validators(validatorId, {
          blockTag: lBlock,
        });
        const after = await stakeManager.validators(validatorId, {
          blockTag: rBlock,
        });

        expect(before.delegatedAmount.eq(after.delegatedAmount)).toBeTruthy();
        expect(reward.own.gt(0)).toBeTruthy();

        expect(after.reward.sub(before.reward).eq(reward.own)).toBeTruthy();

        expect(reward.delegators.gt(0)).toBeTruthy();
        expect(
          after.delegatorsReward
            .sub(before.delegatorsReward)
            .eq(reward.delegators),
        ).toBeTruthy();
      },
      EVENT_PROCESSING_TIMEOUT,
    );

    it.each([
      [117, 16648384],
      [54, 16527522],
      [75, 16625457],
    ])(
      'delegator earning should be correct [%#]',
      async (validatorId, block) => {
        const event = (
          await checkpointsService.getCheckpointEvents(block)
        ).pop();
        expect(event).toBeDefined();
        const checkpoint = await testCheckpointIsValid(event);
        const reward = checkpoint.rewards.find((r) => r.vId === validatorId);
        expect(reward).toBeDefined();
        expect(reward.earned.gt(0)).toBeTruthy();

        const validator = await stakeManager.validators(validatorId, {
          blockTag: block,
        });
        const validatorShare = ValidatorShare__factory.connect(
          validator.contractAddress,
          elRPCProvider,
        );
        const before = await validatorShare.getLiquidRewards(stMATIC, {
          blockTag: block - 1,
        });
        const after = await validatorShare.getLiquidRewards(stMATIC, {
          blockTag: block + 1,
        });
        const diff = after.sub(before);

        expect(diff.gt(0)).toBeTruthy();
        expect(diff.sub(reward.earned).lte(1)).toBeTruthy();
      },
      EVENT_PROCESSING_TIMEOUT,
    );
  });
});
