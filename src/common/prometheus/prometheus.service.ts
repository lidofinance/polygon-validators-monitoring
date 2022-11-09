import { LoggerService } from '@nestjs/common';
import { getOrCreateMetric } from '@willsoto/nestjs-prometheus';

import { Metric, Metrics, Options } from './interfaces';
import { METRICS_PREFIX } from './prometheus.constants';

export enum ResponseStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum TaskStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export class PrometheusService {
  protected readonly prefix = METRICS_PREFIX;

  protected getOrCreateMetric<T extends Metrics, L extends string>(
    type: T,
    options: Options<L>,
  ): Metric<T, L> {
    const nameWithPrefix = this.prefix + options.name;

    return getOrCreateMetric(type, {
      ...options,
      name: nameWithPrefix,
    }) as Metric<T, L>;
  }

  public buildInfo = this.getOrCreateMetric('Gauge', {
    name: 'build_info',
    help: 'Build information',
    labelNames: ['name', 'version', 'commit', 'branch', 'env', 'network'],
  });

  public elRpcRequestDuration = this.getOrCreateMetric('Histogram', {
    name: 'el_rpc_requests_duration_seconds',
    help: 'EL RPC request duration',
    buckets: [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2, 5],
    labelNames: ['status'],
  });

  public lastBlockTimestamp = this.getOrCreateMetric('Gauge', {
    name: 'last_processed_block_timestamp_unix',
    help: 'Timestamp of the last processed block in the worker',
  });

  public missedCheckpoints = this.getOrCreateMetric('Counter', {
    name: 'missed_checkpoints',
    help: 'Missed checkpoints count by validator',
    labelNames: ['vid', 'moniker', 'checkpoint'],
  });

  public tasksDuration = this.getOrCreateMetric('Histogram', {
    name: 'tasks_durations_seconds',
    help: 'Tasks duration',
    buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10],
    labelNames: ['name', 'status'],
  });
}

export function TrackTask(name: string) {
  return function <T extends (...args: any[]) => Promise<unknown>>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const method = descriptor.value as T;

    descriptor.value = async function (
      this: { logger?: LoggerService; prometheus?: PrometheusService },
      ...args
    ) {
      const endTimer = this.prometheus?.tasksDuration.startTimer({ name });
      if (!endTimer) {
        this.logger?.warn(
          'PrometheusService is not available at the given class',
        );

        return await method.apply(this, args);
      }

      const error = await method.apply(this, args);
      if (error !== undefined) {
        endTimer({ status: TaskStatus.FAILURE });
        return error;
      }

      endTimer({ status: TaskStatus.SUCCESS });
    } as T;
  };
}
