import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { CheckpointsService } from 'checkpoints';
import { mean, median } from 'common/helpers';
import { Checkpoint, Metric } from 'storage/entities';

import {
  MONITORING_PERIOD,
  VALIDATORS_PERF_AVG_RATE,
  VALIDATORS_PERF_BENCHMARK,
  VALIDATORS_PERF_CMP,
  VALIDATORS_PERF_INDEX,
  VALIDATORS_PERF_TOP_RATE,
} from './metrics.consts';
import {
  AggrValsPerfRate,
  CmpValsPerfRate,
  TrackedValsPerfRate,
} from './metrics.interfaces';

type DutiesQueryResult = {
  vId: number;
  moniker: string;
  misses: number;
  duties: number;
};

@Injectable()
export class MetricsService {
  public constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,

    protected readonly checkpoints: CheckpointsService,
    protected readonly dataSource: DataSource,
  ) {}

  /**
   * Compute performance for tracked validators and aggregates
   */
  public async computePerformance(checkpoint: Checkpoint): Promise<void> {
    this.logger.debug(
      `Compute performance metrics for checkpoint ${checkpoint.number}`,
    );

    const rows: DutiesQueryResult[] = await this.dataSource.manager.query(
      `select "vId", moniker,
          sum(case when fulfilled = false then 1 else 0 end) as misses,
          count(*) as duties
      from duties as t
      where t."checkpointNumber" between $1::integer and $2::integer
      group by 1,2;
    `,
      [checkpoint.number - MONITORING_PERIOD, checkpoint.number],
    );

    const trackedIds = checkpoint.duties
      .filter((d) => d.isTracked)
      .map((d) => d.vId);

    const ratesOfTracked = rows
      .filter((r) => trackedIds.includes(r.vId))
      .map((r) => {
        const m = new Metric() as TrackedValsPerfRate;
        m.name = VALIDATORS_PERF_INDEX;
        m.blockTimestamp = checkpoint.blockTimestamp;
        m.labels = {
          moniker: r.moniker,
          vId: String(r.vId),
        };
        m.value = this.perfPercent(r);
        return m;
      });

    const perfBench = this.computePB(rows, checkpoint.number);

    const perfBenchMetric = new Metric() as AggrValsPerfRate;
    perfBenchMetric.name = VALIDATORS_PERF_BENCHMARK;
    perfBenchMetric.blockTimestamp = checkpoint.blockTimestamp;
    perfBenchMetric.labels = {};
    perfBenchMetric.value = perfBench;

    const avgPerfMetric = new Metric() as AggrValsPerfRate;
    avgPerfMetric.name = VALIDATORS_PERF_AVG_RATE;
    avgPerfMetric.blockTimestamp = checkpoint.blockTimestamp;
    avgPerfMetric.labels = {};
    avgPerfMetric.value = mean(...rows.map((r) => this.perfPercent(r)));

    const top10Ids = checkpoint.duties.filter((d) => d.isTop).map((d) => d.vId);

    const topPerfMetric = new Metric() as AggrValsPerfRate;
    topPerfMetric.name = VALIDATORS_PERF_TOP_RATE;
    topPerfMetric.blockTimestamp = checkpoint.blockTimestamp;
    topPerfMetric.labels = {};
    topPerfMetric.value = mean(
      ...rows
        .filter((r) => top10Ids.includes(r.vId))
        .map((r) => this.perfPercent(r)),
    );

    const cmpPerfIdxs = ratesOfTracked.map((o) => {
      const m = new Metric() as CmpValsPerfRate;
      m.name = VALIDATORS_PERF_CMP;
      m.blockTimestamp = checkpoint.blockTimestamp;
      m.labels = o.labels;
      m.value = o.value - perfBench;
      return m;
    });

    await this.dataSource.manager.save([
      perfBenchMetric,
      avgPerfMetric,
      topPerfMetric,
      ...ratesOfTracked,
      ...cmpPerfIdxs,
    ]);
  }

  private computePB(rows: DutiesQueryResult[], checkpointNum: number): number {
    const m = median(rows.reduce((p, c) => p.concat(this.perfPercent(c)), []));
    return m * this.getPerformanceMultiple(checkpointNum);
  }

  private perfPercent(row: DutiesQueryResult): number {
    return 1 - row.misses / row.duties;
  }

  /**
   * Return median value multiplier as defined in PIP-4
   */
  private getPerformanceMultiple(checkpointNum: number): number {
    // Bump is postponed, no estimate at the moment
    // if (checkpointNum > 42_943) {
    //   return 0.98;
    // }
    return 0.95;
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

  /**
   *  Return performance benchmark comparison metrics for the given depth
   */
  public async getPBCmpVals(
    maxCheckpointNum: number,
    depth: number,
  ): Promise<CmpValsPerfRate[]> {
    return (await this.dataSource.query(
      `select
         m.*
       from
         metrics m
         inner join checkpoints c on (m."blockTimestamp" = c."blockTimestamp")
       where
         m."name" = '${VALIDATORS_PERF_CMP}'
         and c."number" between $1::integer
         and $2::integer
       order by
         m."blockTimestamp"
       desc;
      `,
      [maxCheckpointNum - depth, maxCheckpointNum],
    )) as CmpValsPerfRate[];
  }
}
