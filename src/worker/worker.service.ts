import { Block } from '@ethersproject/abstract-provider';
import { OneAtTime } from '@lido-nestjs/decorators';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronCommand, CronJob } from 'cron';
import { DataSource } from 'typeorm';

import { CheckpointsService } from 'checkpoints';
import { ConfigService } from 'common/config';
import { PrometheusService, TrackTask } from 'common/prometheus';
import { NewHeaderBlockEvent } from 'contracts/generated/RootChain';
import { MetricsService } from 'metrics';
import { ShareEventsService } from 'shareEvents';
import { Checkpoint, Duty, Metric, ShareEvent } from 'storage/entities';
import { ValidatorsService } from 'validators';

import {
  BLOCK_HANDLE_CHUNK,
  CHECKPOINTS_TO_KEEP,
  DRY_RUN_WINDOW,
  MAIN_JOB_NAME,
  MAX_EXPECTED_BLOCK_FREQUENCY_SECONDS,
  METRICS_COMPUTE_BATCH_SIZE,
  METRICS_COMPUTE_JOB_NAME,
  METRICS_RETENTION_JOB_NAME,
  SECS_PER_BLOCK,
  STAKE_EVENTS_JOB_NAME,
} from './worker.consts';

export class WorkerService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    protected readonly schedulerRegistry: SchedulerRegistry,
    protected readonly checkpoints: CheckpointsService,
    protected readonly shareEvents: ShareEventsService,
    protected readonly validators: ValidatorsService,
    protected readonly prometheus: PrometheusService,
    protected readonly configService: ConfigService,
    protected readonly metrics: MetricsService,
    protected readonly dataSource: DataSource,
  ) {
    this.chainId = this.configService.get('CHAIN_ID');
    this.dryRun = this.configService.get('DRY_RUN');
  }

  protected lastBlock: Pick<Block, 'hash' | 'number'> | null = null;
  protected latestIndexedCheckpoint?: Checkpoint = null;
  protected latestBlockNumber?: number = null;
  protected chainId: number;
  protected dryRun: boolean;

  protected async scheduleJob(
    name: string,
    interval: string,
    cb: CronCommand,
  ): Promise<CronJob> {
    const job = new CronJob(interval, cb);

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.log(`Job ${name} started with interval ${interval}`);

    return job;
  }

  /**
   * Initializes the main update cycle
   */
  public async onModuleInit(): Promise<void> {
    await this.syncMonikers({ force: true });

    const jobs = [
      this.scheduleJob(
        MAIN_JOB_NAME,
        this.configService.get('WORKER_UPDATE_CRON'),
        async () => await this.runMainUpdateCycle(),
      ),
      this.scheduleJob(
        STAKE_EVENTS_JOB_NAME,
        this.configService.get('STAKE_EVENTS_CRON'),
        async () => await this.stakeEvents(),
      ),
      this.scheduleJob(
        METRICS_COMPUTE_JOB_NAME,
        this.configService.get('METRICS_COMPUTE_CRON'),
        async () => await this.computeMetrics(),
      ),
    ];

    // no need in metrics retention in dry run
    if (!this.dryRun) {
      jobs.push(
        this.scheduleJob(
          METRICS_RETENTION_JOB_NAME,
          this.configService.get('METRICS_RETENTION_CRON'),
          async () => await this.metricsRetention(),
        ),
      );
    }

    await Promise.all(jobs);
  }

  /**
   * Runs update cycle
   */
  @OneAtTime()
  @TrackTask(MAIN_JOB_NAME)
  protected async runMainUpdateCycle(): Promise<Error | undefined> {
    try {
      // retrieve the latest block from ethereum
      const latestBlock = await this.provider.getBlock('latest');
      if (!this.isNewBlock(latestBlock)) return;
      this.latestBlockNumber = latestBlock.number;
      this.logger.log(`Latest block ${latestBlock.number}`);

      // process checkpoints in the given range by chunks
      let rangeStart = await this.getStartBlockNumber();
      while (rangeStart <= latestBlock.number) {
        const rangeStop = Math.min(
          rangeStart + BLOCK_HANDLE_CHUNK,
          latestBlock.number,
        );

        await this.handleBlocksRange(rangeStart, rangeStop);

        if (rangeStop === latestBlock.number) {
          this.prometheus.lastBlockTimestamp.set(latestBlock.timestamp);
          this.lastBlock = latestBlock;
          break;
        }

        const { hash, number, timestamp } = await this.provider.getBlock(
          rangeStop,
        );
        this.lastBlock = { hash, number };
        this.prometheus.lastBlockTimestamp.set(timestamp);

        rangeStart = rangeStop;
      }

      this.logger.log('End blocks fetch cycle');
    } catch (error) {
      this.logger.warn('Block fetch cycle terminated with an error');
      this.logger.error(error);
      return error;
    } finally {
      if (this.dryRun) {
        this.logger.warn(`Stop ${MAIN_JOB_NAME} job due to dry run mode`);
        this.schedulerRegistry.getCronJob(MAIN_JOB_NAME)?.stop();
      }
    }
  }

  @OneAtTime()
  @TrackTask(STAKE_EVENTS_JOB_NAME)
  private async stakeEvents() {
    try {
      this.logger.log('Starting stake events collecting job');
      const latestBlock = await this.provider.getBlock('latest');

      // ---

      const lastStakeEvent = await this.shareEvents.getLastStakeEvent();
      let seekStakeEventsFrom = this.configService.get('START_BLOCK');
      if (lastStakeEvent) {
        seekStakeEventsFrom = lastStakeEvent.blockNumber + 1;
      }

      const stakeEventsPromise = this.shareEvents.getStakeEvents(
        seekStakeEventsFrom,
        latestBlock.number,
      );

      // ---

      const lastUnstakeEvent = await this.shareEvents.getLastUnstakeEvent();
      let seekUnstakeEventsFrom = this.configService.get('START_BLOCK');
      if (lastUnstakeEvent) {
        seekUnstakeEventsFrom = lastUnstakeEvent.blockNumber + 1;
      }

      const unstakeEventsPromise = this.shareEvents.getUnstakeEvents(
        seekUnstakeEventsFrom,
        latestBlock.number,
      );

      // ---

      const events = await Promise.all([
        unstakeEventsPromise,
        stakeEventsPromise,
      ]);

      await Promise.all(
        events.flat().map(async (event) => {
          const change = await this.shareEvents.processShareEvent(event);
          await this.shareEvents.storeEvent(change);
        }),
      );

      this.logger.log('Stake events collecting completed');
    } catch (err) {
      this.logger.warn('Stake events collecting task terminated with an error');
      this.logger.error(err);
      return err;
    } finally {
      if (this.dryRun) {
        this.logger.warn(
          `Stop ${STAKE_EVENTS_JOB_NAME} job due to dry run mode`,
        );
        this.schedulerRegistry.getCronJob(STAKE_EVENTS_JOB_NAME)?.stop();
      }
    }
  }

  /**
   * Remove outdated metric labels set to decrease cardinality
   */
  @OneAtTime()
  @TrackTask(METRICS_RETENTION_JOB_NAME)
  private async metricsRetention(): Promise<Error | undefined> {
    try {
      this.logger.log('Starting metrics retention job');

      // get() method is not provided via index.ts, so we should to use the hack
      const metrics = await (this.prometheus.missedCheckpoints as any).get();

      if (!('values' in metrics)) {
        this.logger.warn('Unable to retrieve prometheus metrics values');
        return;
      }

      for (const e of metrics.values) {
        if (
          this.latestIndexedCheckpoint?.number - e.labels.checkpoint >
          CHECKPOINTS_TO_KEEP
        ) {
          this.prometheus.missedCheckpoints.remove(e.labels);

          this.logger.debug(
            `missed_checkpoints metric labels set ${JSON.stringify(
              e.labels,
            )} removed`,
          );
        }
      }

      this.logger.log('Metrics retention succedeed');
    } catch (error) {
      this.logger.warn('Metrics retention task terminated with an error');
      this.logger.error(error);
      return error;
    }
  }

  @OneAtTime()
  @TrackTask(METRICS_COMPUTE_JOB_NAME)
  private async computeMetrics() {
    try {
      this.logger.log('Staring metrics computation');

      const eCheckpointNum =
        await this.checkpoints.getTheHighestSequentialCheckpointNumber();
      const nums = await this.metrics.getCheckpointsNumbersToProcess(
        eCheckpointNum,
        METRICS_COMPUTE_BATCH_SIZE,
      );

      this.logger.debug(`${nums.length} checkpoint(s) to compute metrics`);

      const jobs = nums.map(async (n) => {
        const checkpoint = await this.checkpoints.getCheckpointByNumber(n);
        await this.metrics.computePerformance(checkpoint);
      });

      await Promise.all(jobs);

      this.logger.log('Metrics computation complete');
    } catch (err) {
      this.logger.error('Unable to complete performance metrics computation');
      this.logger.error(err);
      return err;
    }
  }

  @OneAtTime()
  private async syncMonikers(opts: { force?: boolean }) {
    this.logger.log('Updating monikers');

    try {
      const monikers =
        opts.force || false
          ? this.validators.monikers
          : await this.validators.syncMonikers();

      const vIds = [...monikers.keys()];

      const upds = vIds.map(async (vId) => {
        const moniker = monikers.get(vId);

        await this.dataSource
          .createQueryBuilder()
          .update(Duty)
          .set({ moniker: moniker })
          .where('vId = :vId', { vId: vId })
          .execute();

        await this.dataSource
          .createQueryBuilder()
          .update(ShareEvent)
          .set({ moniker: moniker })
          .where('vId = :vId', { vId: vId })
          .execute();

        await this.dataSource
          .createQueryBuilder()
          .update(Metric)
          // DO NOT CHANGE QUOTES IN THE STATEMENT BELOW
          .set({ labels: () => `jsonb_set(labels,'{moniker}','"${moniker}"')` })
          .where("labels ->> 'vId' = :vId", { vId: vId })
          .execute();
      });

      await Promise.all(upds);
    } catch (err) {
      this.logger.error('Unable to update monikers');
      this.logger.error(err);
      return err;
    }

    this.logger.log('Monikers updated');
  }

  /**
   * Check if the given block number is stale
   * relative to the fetched latest one
   */
  private isStaleBlock(blockNumber: number): boolean {
    if (!this.latestBlockNumber) return false;

    const range = this.latestBlockNumber - blockNumber;
    const delta = range * SECS_PER_BLOCK;

    if (delta > MAX_EXPECTED_BLOCK_FREQUENCY_SECONDS) {
      this.logger.warn(`Block ${blockNumber} is too old`);

      return true;
    }

    return false;
  }

  /**
   * Checks if the block is newer than the cached one
   */
  protected isNewBlock(blockInfo: Block): boolean {
    if (!this.lastBlock) return true;

    const prevHash = this.lastBlock.hash;
    const prevNumber = this.lastBlock.number;

    const newHash = blockInfo.hash;
    const newNumber = blockInfo.number;

    const logInfo = {
      prevHash,
      prevNumber,
      newHash,
      newNumber,
    };

    if (prevHash === newHash) {
      this.logger.debug(`Block ${blockInfo.number} received again`);
      return false;
    }

    if (newNumber < prevNumber) {
      this.logger.warn('Fetched block is older than the saved one', logInfo);
      return false;
    }

    if (newNumber === prevNumber && prevNumber !== newNumber) {
      this.logger.warn('Inconsistent blocks found');
    }

    return true;
  }

  private async getStartBlockNumber(): Promise<number> {
    if (this.latestIndexedCheckpoint) {
      return this.latestIndexedCheckpoint.blockNumber + 1;
    }

    if (this.dryRun) {
      this.logger.warn(
        `Select the last ${DRY_RUN_WINDOW} block(s) due to dry run`,
      );

      return this.latestBlockNumber - DRY_RUN_WINDOW;
    }

    // resume processing from the last sequential checkpoint block
    const checkpointToStart =
      await this.checkpoints.getTheHighestSequentialCheckpointNumber();

    if (checkpointToStart !== undefined) {
      this.latestIndexedCheckpoint =
        await this.checkpoints.getCheckpointByNumber(checkpointToStart);

      this.logger.log(
        `The most recent checkpoint in the sequence with number ${this.latestIndexedCheckpoint.number} was found at block ${this.latestIndexedCheckpoint.blockNumber}`,
      );

      const blockNumberFromCheckpoint =
        this.latestIndexedCheckpoint.blockNumber + 1;

      this.logger.log(
        `Resume fetching from block ${blockNumberFromCheckpoint}`,
      );

      return blockNumberFromCheckpoint;
    }

    this.logger.debug(
      'No checkpoints found at the database, using START_BLOCK parameter',
    );

    return this.configService.get('START_BLOCK');
  }

  private exposeMissesForAlerting(checkpoint: Checkpoint): void {
    if (this.isStaleBlock(checkpoint.blockNumber)) {
      this.logger.warn('Skipping stale checkpoint metrics update');
      return;
    }

    const misses = checkpoint.duties.filter((d) => d.isTracked && !d.fulfilled);

    for (const miss of misses) {
      this.logger.debug(
        `Checkpoint ${checkpoint.number} skipped by ${miss.moniker}`,
      );

      this.prometheus.missedCheckpoints
        .labels(miss.vId.toString(), miss.moniker, checkpoint.number.toString())
        .inc();
    }
  }

  private async handleCheckpointEvent(
    event: NewHeaderBlockEvent,
  ): Promise<Checkpoint> {
    const checkpointNumber =
      this.checkpoints.getCheckpointNumberFromEvent(event);

    const dbCheckpoint = await this.checkpoints.getCheckpointByNumber(
      checkpointNumber,
    );
    if (dbCheckpoint) {
      this.logger.debug(
        `Skipping checkpoint ${checkpointNumber}, it is already processed`,
      );

      return dbCheckpoint;
    }

    const checkpoint = await this.checkpoints.processCheckpointEvent(event);
    await this.checkpoints.storeCheckpoint(checkpoint);

    if (
      this.latestIndexedCheckpoint === null ||
      checkpoint.number > this.latestIndexedCheckpoint?.number
    ) {
      this.logger.debug(`The latest found checkpoint is ${checkpointNumber}`);
      this.latestIndexedCheckpoint = checkpoint;
    }

    this.exposeMissesForAlerting(checkpoint);

    return checkpoint;
  }

  /**
   * Check that checkpoints in the given events are in sequence
   */
  private checkEventsConsistency(events: NewHeaderBlockEvent[]): void {
    let pointer = events.at(0);

    for (const event of events) {
      const prevNumber = this.checkpoints.getCheckpointNumberFromEvent(pointer);
      const nextNumber = this.checkpoints.getCheckpointNumberFromEvent(event);

      if (nextNumber - prevNumber > 1) {
        throw Error(
          `Checkpoints gap: ${prevNumber}-${nextNumber}, for blocks ${pointer.blockNumber}-${event.blockNumber}`,
        );
      }

      pointer = event;
    }
  }

  private async handleBlocksRange(
    fromBlock: number,
    toBlock: number,
  ): Promise<void> {
    const events = await this.checkpoints.getCheckpointEvents(
      fromBlock,
      toBlock,
    );
    if (!events.length) return;

    this.checkEventsConsistency(
      events.sort((a, b) => a.blockNumber - b.blockNumber),
    );

    await Promise.all(
      events.map(async (e) => await this.handleCheckpointEvent(e)),
    );
  }
}
