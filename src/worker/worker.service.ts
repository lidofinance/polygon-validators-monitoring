import { Block, BlockTag } from '@ethersproject/abstract-provider';
import { OneAtTime } from '@lido-nestjs/decorators';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronCommand, CronJob } from 'cron';
import { takeRightWhile } from 'lodash';
import { DataSource } from 'typeorm';

import { CheckpointsService } from 'checkpoints';
import { ConfigService } from 'common/config';
import { takeWhile } from 'common/helpers';
import { allSettled } from 'common/helpers/promises';
import { PrometheusService, TrackTask } from 'common/prometheus';
import { MetricRegistry } from 'common/prometheus/interfaces';
import { NewHeaderBlockEvent } from 'contracts/generated/RootChain';
import { MONITORING_PERIOD, MetricsService } from 'metrics';
import { ShareEventsService } from 'shareEvents';
import { Checkpoint, Duty, Metric, ShareEvent } from 'storage/entities';
import { ValidatorsService } from 'validators';

import {
  CHECKPOINTS_TO_KEEP,
  DRY_RUN_WINDOW,
  MAIN_JOB_NAME,
  METRICS_COMPUTE_BATCH_SIZE,
  METRICS_RETENTION_JOB_NAME,
  STAKE_EVENTS_JOB_NAME,
  STALE_CHECKPOINT_THRESHOLD,
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
  protected latestBlockNumber?: number = null;
  protected lastMultiMissCheckpointNumber?: number = null;
  protected chainId: number;
  protected dryRun: boolean;

  /**
   * Initializes the main update cycle
   */
  public async onModuleInit(): Promise<void> {
    await this.syncMonikers({ force: true });

    this.scheduleJob(
      MAIN_JOB_NAME,
      this.configService.get('WORKER_UPDATE_CRON'),
      async () => await this.runMainUpdateCycle(),
    );
    this.scheduleJob(
      STAKE_EVENTS_JOB_NAME,
      this.configService.get('STAKE_EVENTS_CRON'),
      async () => await this.stakeEvents(),
    );

    // no need in metrics retention in dry run
    if (!this.dryRun) {
      this.scheduleJob(
        METRICS_RETENTION_JOB_NAME,
        this.configService.get('METRICS_RETENTION_CRON'),
        async () => await this.metricsRetention(),
      );
    }
  }

  protected scheduleJob(
    name: string,
    interval: string,
    cb: CronCommand,
  ): CronJob {
    const job = new CronJob(interval, cb);

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.log(`Job ${name} started with interval ${interval}`);

    return job;
  }

  /**
   * Runs update cycle
   */
  @OneAtTime()
  @TrackTask(MAIN_JOB_NAME)
  protected async runMainUpdateCycle(): Promise<Error | undefined> {
    try {
      this.logger.log('Starting main update cycle');
      // retrieve the latest block from ethereum
      const latestBlock = await this.provider.getBlock('latest');
      if (!this.isNewBlock(latestBlock)) {
        this.logger.log('No new blocks found, terminating main update cycle');
        return;
      }
      this.latestBlockNumber = latestBlock.number;
      this.logger.log(`Latest block ${latestBlock.number}`);

      // process checkpoints in the given range by chunks
      let rangeStart = await this.getStartBlockNumber();
      this.logger.log(`Continue fetching from block ${rangeStart}`);

      while (rangeStart < latestBlock.number) {
        const rangeStop = Math.min(
          rangeStart + this.configService.get('BLOCK_HANDLE_CHUNK'),
          latestBlock.number,
        );

        await this.handleBlocksRange(rangeStart, rangeStop);
        await this.updateLastBlock(rangeStop);

        rangeStart = rangeStop;
      }

      // metric's fast-forwarding to the latest block
      await this.updateLastBlock(this.latestBlockNumber);
      await this.computeMetrics();

      const lastSeqCheckpoint =
        await this.checkpoints.getTheHighestSequentialCheckpoint();
      if (lastSeqCheckpoint) {
        if (this.isStaleCheckpoint(lastSeqCheckpoint)) {
          this.logger.warn(
            `Last sequential checkpoint ${lastSeqCheckpoint.number} is stale and ` +
              `will be skipped for metrics computation`,
          );
        } else {
          await allSettled([
            this.exposeUnderPerfStrike(lastSeqCheckpoint),
            this.exposeCheckpointMissesInRow(lastSeqCheckpoint),
          ]);
        }
      }

      this.logger.log("End block's fetch cycle");
    } catch (error) {
      this.logger.warn("Block's fetch cycle terminated with an error");
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

      const stakeEvents = await this.shareEvents.getStakeEvents(
        seekStakeEventsFrom,
        latestBlock.number,
      );

      // ---

      const lastUnstakeEvent = await this.shareEvents.getLastUnstakeEvent();
      let seekUnstakeEventsFrom = this.configService.get('START_BLOCK');
      if (lastUnstakeEvent) {
        seekUnstakeEventsFrom = lastUnstakeEvent.blockNumber + 1;
      }

      const unstakeEvents = await this.shareEvents.getUnstakeEvents(
        seekUnstakeEventsFrom,
        latestBlock.number,
      );

      // ---

      await allSettled(
        [stakeEvents, unstakeEvents].flat().map(async (event) => {
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
      const metrics: MetricRegistry = await (
        this.prometheus.missedCheckpoints as any
      ).get();

      if (!('values' in metrics)) {
        this.logger.warn('Unable to retrieve prometheus metrics values');
        return;
      }

      const maxCheckpoint = metrics.values.reduce(
        (max, m) => (m.labels.checkpoint > max ? m.labels.checkpoint : max),
        0,
      );

      for (const e of metrics.values) {
        if (maxCheckpoint - e.labels.checkpoint > CHECKPOINTS_TO_KEEP) {
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

  private async computeMetrics(): Promise<void> {
    this.logger.log('Starting metrics computation');

    const eCheckpointNum =
      await this.checkpoints.getTheHighestSequentialCheckpointNumber();

    if (!eCheckpointNum) {
      return;
    }

    let nums = []; // checkpoints numbers to process

    do {
      nums = await this.metrics.getCheckpointsNumbersToProcess(
        eCheckpointNum,
        METRICS_COMPUTE_BATCH_SIZE,
      );

      this.logger.debug(`${nums.length} checkpoint(s) to compute metrics`);

      const jobs = nums.map(async (n) => {
        const checkpoint = await this.checkpoints.getCheckpointByNumber(n);
        await this.metrics.computePerformance(checkpoint);
      });

      await allSettled(jobs);
    } while (nums.length > 0);

    this.logger.log(
      `Metrics computation complete, metrics head: ${eCheckpointNum}`,
    );
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

      await allSettled(upds);
    } catch (err) {
      this.logger.error('Unable to update monikers');
      this.logger.error(err);
      return err;
    }

    this.logger.log('Monikers updated');
  }

  /**
   * Check if the given checkpoint is stale
   */
  private isStaleCheckpoint(checkpoint: Checkpoint): boolean {
    return (
      Date.now() / 1000 - checkpoint.blockTimestamp > STALE_CHECKPOINT_THRESHOLD
    );
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
    if (this.dryRun) {
      this.logger.warn(
        `Select the last ${DRY_RUN_WINDOW} block(s) due to dry run`,
      );

      return this.latestBlockNumber - DRY_RUN_WINDOW;
    }

    // resume processing from the last sequential checkpoint block
    const highestNum =
      await this.checkpoints.getTheHighestSequentialCheckpointNumber();

    if (highestNum !== undefined) {
      const checkpointToStart = await this.checkpoints.getCheckpointByNumber(
        highestNum,
      );

      this.logger.debug(
        `The most recent checkpoint in the sequence with number ${checkpointToStart.number} was found at block ${checkpointToStart.blockNumber}`,
      );
      return checkpointToStart.blockNumber + 1;
    }

    this.logger.debug(
      'No checkpoints found at the database, using START_BLOCK parameter',
    );

    return this.configService.get('START_BLOCK');
  }

  private async handleCheckpointEvent(
    event: NewHeaderBlockEvent,
  ): Promise<Checkpoint> {
    const checkpointNumber =
      this.checkpoints.getCheckpointNumberFromEvent(event);

    const wasIndexed = await this.checkpoints.checkpointExists(
      checkpointNumber,
    );

    if (wasIndexed) {
      this.logger.debug(
        `Skipping checkpoint ${checkpointNumber}, it is already processed`,
      );

      const dbCheckpoint = await this.checkpoints.getCheckpointByNumber(
        checkpointNumber,
      );

      if (!dbCheckpoint) {
        throw new Error(
          `Checkpoint ${checkpointNumber} exists in the database but cannot be retrieved`,
        );
      }

      return dbCheckpoint;
    }

    const checkpoint = await this.checkpoints.processCheckpointEvent(event);
    await this.checkpoints.storeCheckpoint(checkpoint);

    if (!this.isStaleCheckpoint(checkpoint)) {
      this.exposeCheckpointMisses(checkpoint);
    } else {
      this.logger.warn('Skipping stale checkpoint metrics update');
    }

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
  ): Promise<Checkpoint[]> {
    const events = await this.checkpoints.getCheckpointEvents(
      fromBlock,
      toBlock,
    );
    if (!events.length) return;

    this.checkEventsConsistency(
      events.sort((a, b) => a.blockNumber - b.blockNumber),
    );

    const checkpoints = await allSettled(
      events.map((e) => this.handleCheckpointEvent(e)),
    );
    return checkpoints;
  }

  /**
   * Expose metric of missed checkpoint by the validators
   */
  private exposeCheckpointMisses(checkpoint: Checkpoint): void {
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

  private async exposeCheckpointMissesInRow(
    checkpoint: Checkpoint,
  ): Promise<void> {
    if (
      this.lastMultiMissCheckpointNumber &&
      this.lastMultiMissCheckpointNumber >= checkpoint.number
    ) {
      return;
    }

    this.logger.log(
      `Calculating misses in a row for checkpoint ${checkpoint.number}`,
    );

    const duties = await this.dataSource
      .getRepository(Duty)
      .createQueryBuilder('duties')
      .where('"isTracked" = true')
      .andWhere('"checkpointNumber" > :from', {
        from:
          checkpoint.number -
          this.configService.get('CHECKPOINTS_IN_ROW_LIMIT'),
      })
      .andWhere('"checkpointNumber" <= :to', { to: checkpoint.number })
      .orderBy('"checkpointNumber"', 'ASC')
      .getMany();

    const valToDuties = duties.reduce((acc, d) => {
      if (!acc[d.vId]) {
        acc[d.vId] = [];
      }
      acc[d.vId].push(d);
      return acc;
    }, {} as { [key: number]: Duty[] });

    const trackedVals = checkpoint.duties
      .filter((d) => d.isTracked)
      .map((d) => {
        return {
          vId: d.vId,
          moniker: d.moniker,
        };
      });

    trackedVals.forEach((v) => {
      this.prometheus.missedCheckpointsInRow
        .labels(v.vId.toString(), v.moniker)
        .set(takeRightWhile(valToDuties[v.vId], (d) => !d?.fulfilled).length);
    });

    this.lastMultiMissCheckpointNumber = checkpoint.number;
  }

  /**
   * Expose metric of checkpoints under PB in the row for the given validator
   */
  private async exposeUnderPerfStrike(checkpoint: Checkpoint): Promise<void> {
    const trackedVals = checkpoint.duties
      .filter((d) => d.isTracked)
      .map((d) => {
        return {
          vId: d.vId,
          moniker: d.moniker,
        };
      });

    const values = await this.metrics.getPBCmpVals(
      checkpoint.number,
      MONITORING_PERIOD * 3, // GP1 - 0, GP2, FN, and the upper bound
    );

    const buf: { [key: string]: number[] } = Object.fromEntries(
      trackedVals.map((o) => [o.vId, []]),
    );
    for (const metric of values) {
      const vId = metric.labels.vId;
      if (buf[vId] === undefined) {
        // latest checkpoint may not include all tracked validators
        this.logger.warn(`Unable to find ${vId} in tracked validators buffer`);
      }
      buf[vId]?.push(metric.value); // sorted by timestamp list of comparison results
    }

    for (const v of trackedVals) {
      const s = takeWhile(buf[v.vId], (o: number) => o < 0).length;
      this.prometheus.underPBStrike
        .labels({ vid: v.vId.toString(), moniker: v.moniker })
        .set(s);
    }
  }

  private async updateLastBlock(blockNumber: BlockTag): Promise<void> {
    if (blockNumber === this.lastBlock?.number) return;

    const { hash, number, timestamp } = await this.provider.getBlock(
      blockNumber,
    );
    this.lastBlock = { hash, number };
    this.prometheus.lastBlockTimestamp.set(timestamp);
  }
}
