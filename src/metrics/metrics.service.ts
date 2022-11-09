import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { CheckpointsService } from 'checkpoints';
import { Checkpoint, Metric } from 'storage/entities';

import {
  AVG_VALIDATORS_PERF_RATE,
  TOP_VALIDATORS_PERF_RATE,
  TRACKED_VALIDATORS_PERF_RATE,
} from './metrics.consts';
import { AggrValsPerfRate, TrackedValsPerfRate } from './metrics.interfaces';

type DutiesQueryResult = {
  vId: number;
  moniker: string;
  misses: number;
  duties: number;
};

function computeAvg(rows: DutiesQueryResult[]): number {
  return (
    1 -
    rows.reduce((s, r) => s + Number(r.misses), 0) /
      rows.reduce((s, r) => s + Number(r.duties), 0)
  );
}

@Injectable()
export class MetricsService {
  public constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,

    protected readonly checkpoints: CheckpointsService,
    protected readonly configService: ConfigService,
    protected readonly dataSource: DataSource,
  ) {}

  /**
   * Compute performance for tracked validators and aggregates
   */
  public async computePerformance(checkpoint: Checkpoint): Promise<void> {
    this.logger.debug(
      `Compute performance metrics for checkpoint ${checkpoint.number}`,
    );

    const offset = this.configService.get('STATS_CHECKPOINTS_DEPTH') - 1;

    const rows: DutiesQueryResult[] = await this.dataSource.manager.query(
      `select "vId", moniker,
          sum(case when fulfilled = false then 1 else 0 end) as misses,
          count(*) as duties
      from duties as t
      where t."checkpointNumber" between $1::integer and $2::integer
      group by 1,2;
    `,
      [checkpoint.number - offset, checkpoint.number],
    );

    const trackedIds = checkpoint.duties
      .filter((d) => d.isTracked)
      .map((d) => d.vId);

    const top10Ids = checkpoint.duties.filter((d) => d.isTop).map((d) => d.vId);

    const ratesOfTracked = rows
      .filter((r) => trackedIds.includes(r.vId))
      .map((r) => {
        const m = new Metric() as TrackedValsPerfRate;
        m.name = TRACKED_VALIDATORS_PERF_RATE;
        m.blockTimestamp = checkpoint.blockTimestamp;
        m.labels = {
          moniker: r.moniker,
          vId: String(r.vId),
        };
        m.value = 1 - Number(r.misses / r.duties);
        return m;
      });

    const avgPerfMetric = new Metric() as AggrValsPerfRate;
    avgPerfMetric.name = AVG_VALIDATORS_PERF_RATE;
    avgPerfMetric.blockTimestamp = checkpoint.blockTimestamp;
    avgPerfMetric.labels = {};
    avgPerfMetric.value = computeAvg(
      rows.filter((r) => !trackedIds.includes(r.vId)),
    );

    const topPerfMetric = new Metric() as AggrValsPerfRate;
    topPerfMetric.name = TOP_VALIDATORS_PERF_RATE;
    topPerfMetric.blockTimestamp = checkpoint.blockTimestamp;
    topPerfMetric.labels = {};
    topPerfMetric.value = computeAvg(
      rows.filter((r) => top10Ids.includes(r.vId)),
    );

    await this.dataSource.manager.save([
      ...ratesOfTracked,
      avgPerfMetric,
      topPerfMetric,
    ]);
  }

  public async getCheckpointsNumbersToProcess(
    maxCheckpointNum: number,
    limit: number,
  ): Promise<number[]> {
    return (
      await this.dataSource.query(
        `with computed_tss as (
          select
            distinct "blockTimestamp"
          from
            metrics
        )
        select
          "number"
        from
          checkpoints
        where
          "blockTimestamp" not in (
            select
              "blockTimestamp"
            from
              computed_tss
          )
          and "number" <= $1::integer
        order by
          "number" desc
        limit
          $2::integer;`,
        [maxCheckpointNum, limit],
      )
    ).map((r: { number: number }) => r.number);
  }
}
