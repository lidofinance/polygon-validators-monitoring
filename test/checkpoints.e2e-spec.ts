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
import { NewHeaderBlockEvent } from 'contracts/generated/RootChain';
import { Checkpoint } from 'storage/entities';
import { ACTIVE_SET_SIZE, ValidatorsModule } from 'validators';
import { DRY_RUN_WINDOW } from 'worker';

const EVENT_PROCESSING_TIMEOUT = 60_000;

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
        CheckpointsModule,
        ValidatorsModule,
        TypeOrmStub,
        {
          // resolve dependency for ValidatorsModule
          module: ConfigModule,
          providers: [
            {
              provide: ConfigService,
              useValue: undefined,
            },
          ],
        },
      ],
    }).compile();

    elRPCProvider = moduleRef.get(SimpleFallbackJsonRpcBatchProvider);
    checkpointsService = moduleRef.get(CheckpointsService);
  });

  async function testCheckpointIsValid(
    event: NewHeaderBlockEvent,
  ): Promise<Checkpoint> {
    const checkpoint = await checkpointsService.processCheckpointEvent(event);
    expect(checkpoint.duties.length).toEqual(ACTIVE_SET_SIZE);
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
});
