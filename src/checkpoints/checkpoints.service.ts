import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { arrayify, keccak256 } from 'ethers/lib/utils';
import { Between, DataSource } from 'typeorm';

import { ConfigService } from 'common/config';
import {
  JACK_TOKEN,
  Jack,
  JackExecuteArgs,
  MAX_DEPOSITS,
  ROOT_CHAIN_TOKEN,
  RootChain,
  STAKE_MANAGER_TOKEN,
  StakeManager,
  SubmitCheckpointArgs,
  ValidatorShare__factory,
} from 'contracts';
import { NewHeaderBlockEvent } from 'contracts/generated/RootChain';
import { Checkpoint, Duty, Reward } from 'storage/entities';
import { ValidatorsService } from 'validators';

import { REWARD_PRECISION } from './checkpoints.consts';
import { convertToSignature, getSignerAddress } from './checkpoints.helpers';

@Injectable()
export class CheckpointsService {
  constructor(
    @Inject(STAKE_MANAGER_TOKEN) protected readonly stakeManager: StakeManager,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @Inject(ROOT_CHAIN_TOKEN) protected readonly rootChain: RootChain,
    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    @Inject(JACK_TOKEN) protected readonly jack: Jack,
    protected readonly validators: ValidatorsService,
    protected readonly configService: ConfigService,
    protected readonly dataSource: DataSource,
  ) {}

  /**
   * Extract signers addresses from submitCheckpoint call data
   */
  public extractSignersFromTxData(data: string): string[] {
    const args = this.rootChain.interface.decodeFunctionData(
      this.rootChain.interface.getFunction('submitCheckpoint'),
      data,
    ) as unknown as SubmitCheckpointArgs;

    // look at RootChain.sol:43 for explanation
    const bytes = [1, ...arrayify(args.data)];
    const hash = keccak256(bytes);

    const signers: string[] = [];
    for (const sig of args.sigs) {
      const signer = getSignerAddress(hash, convertToSignature(sig));
      signers.push(signer);
    }

    return signers;
  }

  /**
   * Get submitCheckpoint function call data from the event
   */
  public async getCheckpointDataFromEvent(
    event: NewHeaderBlockEvent,
  ): Promise<string> {
    const tx = await event.getTransaction();
    const checkpointNum = this.getCheckpointNumberFromEvent(event);

    // event may be emited by the call from other contract
    if (getAddress(tx.to) === getAddress(this.jack.address)) {
      this.logger.warn(`Checkpoint ${checkpointNum} was sent indirectly`);
      // the call data is an argument `data` of `execute` function
      const args = this.jack.interface.decodeFunctionData(
        this.jack.interface.getFunction('execute'),
        tx.data,
      ) as unknown as JackExecuteArgs;
      return args.data;
    }

    return tx.data;
  }

  /**
   * Get checkpoint number from the given event
   */
  public getCheckpointNumberFromEvent(event: NewHeaderBlockEvent): number {
    // RootChain.sol:51
    // _nextHeaderBlock = _nextHeaderBlock.add(MAX_DEPOSITS);
    return event.args.headerBlockId.div(MAX_DEPOSITS).toNumber();
  }

  /**
   * Get checkpoint events within the given blocks range
   */
  public async getCheckpointEvents(
    fromBlock: number,
    toBlock?: number,
  ): Promise<NewHeaderBlockEvent[]> {
    const events = await this.rootChain.queryFilter(
      this.rootChain.filters.NewHeaderBlock(),
      fromBlock,
      toBlock ?? fromBlock, // check the fromBlock only if no toBlock provided
    );

    this.logger.log(
      `${events.length} checkpoint(s) found between blocks ${fromBlock} and ${toBlock}`,
    );
    return events;
  }

  public async processCheckpointEvent(
    event: NewHeaderBlockEvent,
  ): Promise<Checkpoint> {
    const checkpointNumber = this.getCheckpointNumberFromEvent(event);

    this.logger.log(
      `Read checkpoint ${checkpointNumber} at block ${event.blockNumber}`,
    );

    const checkpoint = new Checkpoint();
    checkpoint.number = checkpointNumber;
    checkpoint.blockNumber = event.blockNumber;
    checkpoint.blockTimestamp = (await event.getBlock()).timestamp;
    checkpoint.txHash = event.transactionHash;
    checkpoint.proposer = event.args.proposer;
    checkpoint.totalReward = event.args.reward;
    // foreign entities
    checkpoint.rewards = [];
    checkpoint.duties = [];

    const checkpointData = await this.getCheckpointDataFromEvent(event);
    const signers = this.extractSignersFromTxData(checkpointData);

    this.logger.debug(
      `Found ${signers.length} signatures at checkpoint ${checkpointNumber}`,
    );

    const atCheckpointBlock = { blockTag: event.blockNumber };
    const epoch = BigNumber.from(checkpoint.number + 1);

    const [trackedIds, activeSet] = await Promise.all([
      this.validators.getTrackedValidatorsIds(atCheckpointBlock),
      this.validators.getValidatorsActiveSet(atCheckpointBlock, epoch),
    ]);

    const committed = await Promise.all(
      signers.map((signer) =>
        this.validators.signerToValidatorId(signer, atCheckpointBlock),
      ),
    );

    const stakeOfSigners = activeSet
      .filter((v) => committed.includes(v.id))
      .reduce(
        (t, v) => t.add(v.delegatedAmount).add(v.amount),
        BigNumber.from(0),
      );

    const proposerBonus = await this.stakeManager.proposerBonus(
      atCheckpointBlock,
    );
    const proposerReward = checkpoint.totalReward.mul(proposerBonus).div(100);
    const rewardPerStake = checkpoint.totalReward
      .sub(proposerReward)
      .mul(REWARD_PRECISION)
      .div(stakeOfSigners);

    // I believe there should be `cmp` method on BigNumber, but it lacks;
    // sort in descending order
    const top10ids = activeSet
      .sort((a, b) =>
        a.amount.add(a.delegatedAmount).gt(b.amount.add(b.delegatedAmount))
          ? -1
          : 1,
      )
      .map((v) => v.id)
      .slice(0, 10);

    this.logger.debug(
      `Top 10 validators ids: [${top10ids}] at block ${event.blockNumber}`,
    );

    for (const v of activeSet) {
      const duty = new Duty();

      duty.checkpoint = checkpoint;
      duty.fulfilled = committed.includes(v.id);
      duty.vId = v.id;
      duty.moniker = this.validators.getMoniker(v.id);
      duty.blockTimestamp = checkpoint.blockTimestamp;
      duty.isTracked = trackedIds.includes(v.id);
      duty.isTop = top10ids.includes(v.id);
      duty.isProposer = v.signer === checkpoint.proposer;

      const rew = new Reward();

      rew.vId = v.id;
      rew.checkpoint = checkpoint;
      rew.own = BigNumber.from(0);
      rew.delegators = BigNumber.from(0);
      rew.earned = BigNumber.from(0); // by monitored delegators only
      rew.blockTimestamp = checkpoint.blockTimestamp;
      rew.moniker = this.validators.getMoniker(v.id);

      if (duty.fulfilled) {
        if (duty.isProposer) {
          rew.own = rew.own.add(proposerReward);
        }

        const totalStake = v.amount.add(v.delegatedAmount);
        const rewardsOnTotalStake = totalStake
          .mul(rewardPerStake)
          .div(REWARD_PRECISION);
        const rewardsOnOwnStake = rewardsOnTotalStake
          .mul(v.amount)
          .div(totalStake);
        const commissionedRewards = rewardsOnTotalStake
          .sub(rewardsOnOwnStake)
          .mul(v.commissionRate)
          .div(100);

        rew.delegators = rew.delegators.add(
          rewardsOnTotalStake.sub(rewardsOnOwnStake.add(commissionedRewards)),
        );
        rew.own = rew.own.add(rewardsOnOwnStake.add(commissionedRewards));

        const delegators = this.configService.get('DELEGATORS');
        if (delegators?.length) {
          const erc20like = ValidatorShare__factory.connect(
            v.contractAddress,
            this.provider,
          );

          let delegatorsShares = BigNumber.from(0);
          for (const d of delegators) {
            delegatorsShares = delegatorsShares.add(
              await erc20like.balanceOf(d, atCheckpointBlock),
            );
          }

          if (delegatorsShares.gt(0)) {
            const totalShares = await erc20like.totalSupply(atCheckpointBlock);
            const rewardPerShare = rew.delegators
              .mul(REWARD_PRECISION)
              .div(totalShares);
            rew.earned = delegatorsShares
              .mul(rewardPerShare)
              .div(REWARD_PRECISION);
          }
        }
      }

      checkpoint.rewards.push(rew);
      checkpoint.duties.push(duty);
    }

    this.logger.log(`Checkpoint ${checkpointNumber} processed`);

    return checkpoint;
  }

  /**
   * Save the checkpoint and related entities to the storage in one transaction
   */
  public async storeCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(checkpoint);
      await queryRunner.manager.save(checkpoint.duties);
      await queryRunner.manager.save(checkpoint.rewards);

      await queryRunner.commitTransaction();
    } catch (err) {
      this.logger.error(`Failed to store checkpoint ${checkpoint.number}`);
      this.logger.error(err);

      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if the checkpoint exists
   */
  public async checkpointExists(checkpointNumber: number): Promise<boolean> {
    return this.dataSource.manager.exists(Checkpoint, {
      where: {
        number: checkpointNumber,
      },
    });
  }

  /**
   * Retrieve a checkpoint by the given number
   */
  public async getCheckpointByNumber(
    number: number,
  ): Promise<Checkpoint | null> {
    return await this.dataSource.manager.findOneBy(Checkpoint, { number });
  }

  /**
   * Retrieve a checkpoints range (inlcusive) in ascending order
   */
  public async getCheckpointsRange(
    firstNum: number,
    lastNum: number,
  ): Promise<Checkpoint[]> {
    return await this.dataSource.manager.find(Checkpoint, {
      where: { number: Between(firstNum, lastNum) },
      order: { number: 'ASC' },
    });
  }

  /**
   * Get missing checkpoints numbers
   */
  public async getMissingCheckpointsNumbers(
    from: number,
    to: number,
  ): Promise<number[]> {
    const rows: any[] = await this.dataSource.manager.query(
      'select s.i as missing from generate_series($1::integer,$2::integer) s(i) ' +
        'where not exists (select 1 from checkpoints c where c.number = s.i);',
      [from, to],
    );

    return rows.map((r) => r.missing).sort();
  }

  /**
   * Get the lowest checkpoint number in the database
   */
  public async minCheckpointNumber(): Promise<number | undefined> {
    const { min } = await this.dataSource
      .createQueryBuilder(Checkpoint, 'c')
      .select('min(number) as min')
      .getRawOne();

    return min;
  }

  /**
   * Get the highest checkpoint number in the database
   */
  public async maxCheckpointNumber(): Promise<number | undefined> {
    const { max } = await this.dataSource
      .createQueryBuilder(Checkpoint, 'c')
      .select('max(number) as max')
      .getRawOne();

    return max;
  }

  /**
   * Get the highest checkpoint number in the sequence without gaps
   *
   * 1,2,3,5,6 => 3
   * 1,2,3,4,5 => 5
   */
  public async getTheHighestSequentialCheckpointNumber(): Promise<
    number | undefined
  > {
    const [min, max] = await Promise.all([
      this.minCheckpointNumber(),
      this.maxCheckpointNumber(),
    ]);

    if (!min || !max) {
      return;
    }

    const seq = await this.getMissingCheckpointsNumbers(min, max);

    if (!seq.length) {
      return max;
    }

    return seq.at(0) - 1;
  }
}
