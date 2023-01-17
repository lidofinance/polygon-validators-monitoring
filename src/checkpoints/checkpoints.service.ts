import { getAddress } from '@ethersproject/address';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Between, DataSource } from 'typeorm';

import {
  JACK_TOKEN,
  Jack,
  JackExecuteArgs,
  MAX_DEPOSITS,
  ROOT_CHAIN_TOKEN,
  RootChain,
  SubmitCheckpointArgs,
} from 'contracts';
import { NewHeaderBlockEvent } from 'contracts/generated/RootChain';
import { Checkpoint, Duty } from 'storage/entities';
import { ValidatorsService } from 'validators';

import { convertToSignature, getSignerAddress } from './checkpoints.helpers';

@Injectable()
export class CheckpointsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @Inject(ROOT_CHAIN_TOKEN) protected readonly rootChain: RootChain,
    @Inject(JACK_TOKEN) protected readonly jack: Jack,

    protected readonly validators: ValidatorsService,
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

    const signers: string[] = [];
    for (const sig of args.sigs) {
      const signer = getSignerAddress(args.data, convertToSignature(sig));
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
    checkpoint.duties = [];

    const checkpointData = await this.getCheckpointDataFromEvent(event);
    const signers = this.extractSignersFromTxData(checkpointData);

    this.logger.debug(
      `Found ${signers.length} signatures at checkpoint ${checkpointNumber}`,
    );

    const opts = { blockTag: event.blockNumber };

    const [trackedIds, activeSet] = await Promise.all([
      this.validators.getTrackedValidatorsIds(opts),
      this.validators.getValidatorsActiveSet(opts),
    ]);

    const commited = await Promise.all(
      signers.map((signer) =>
        this.validators.signerToValidatorId(signer, opts),
      ),
    );

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
      duty.fulfilled = commited.includes(v.id);
      duty.vId = v.id;
      duty.moniker = this.validators.getMoniker(v.id);
      duty.blockTimestamp = checkpoint.blockTimestamp;
      duty.isTracked = trackedIds.includes(v.id);
      duty.isTop = top10ids.includes(v.id);

      checkpoint.duties.push(duty);
    }

    this.logger.log(`Checkpoint ${checkpointNumber} processed`);

    return checkpoint;
  }

  /**
   * Save the checkpoint and related entities to the storage
   */
  public async storeCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(checkpoint);
      await queryRunner.manager.save(checkpoint.duties);

      await queryRunner.commitTransaction();
    } catch (err) {
      this.logger.warn('Unable to store checkpoint');
      this.logger.error(err);

      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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
   * Retrieve a checkpoints range
   */
  public async getCheckpointsRange(
    firstNum: number,
    lastNum: number,
  ): Promise<Checkpoint[]> {
    return await this.dataSource.manager.find(Checkpoint, {
      where: { number: Between(firstNum, lastNum) },
    });
  }

  /**
   * Get the last checkpoint
   */
  public async getLastCheckpoint(): Promise<Checkpoint | null> {
    return this.getOneInOrder('desc');
  }

  /**
   * Get the one checkpoint from the selected end (last / first)
   */
  public async getOneInOrder(
    direction: 'asc' | 'desc',
  ): Promise<Checkpoint | null> {
    const entries = await this.dataSource.manager.find(Checkpoint, {
      order: {
        blockTimestamp: {
          direction,
        },
      },
      take: 1,
    });

    return entries.pop() ?? null;
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
   * Get the highest checkpoint number in the sequence without gaps
   *
   * 1,2,3,5,6 => 3
   * 1,2,3,4,5 => 5
   */
  public async getTheHighestSequentialCheckpointNumber(): Promise<
    number | undefined
  > {
    const [first, last] = await Promise.all([
      this.getOneInOrder('asc'),
      this.getOneInOrder('desc'),
    ]);

    if (first === null || last === null) {
      return;
    }

    const seq = await this.getMissingCheckpointsNumbers(
      first.number,
      last.number,
    );

    if (!seq.length) {
      return last.number;
    }

    return seq.at(0) - 1;
  }
}
