import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import { CheckpointsService } from './checkpoints.service';

@Injectable()
export class CheckpointsHealthIndicator extends HealthIndicator {
  constructor(protected readonly checkpoints: CheckpointsService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const [first, last] = await Promise.all([
      this.checkpoints.getOneInOrder('asc'),
      this.checkpoints.getOneInOrder('desc'),
    ]);

    if (first === null || last === null || first === last) {
      return this.getStatus(key, true);
    }

    const seq = await this.checkpoints.getMissingCheckpointsNumbers(
      first.number,
      last.number,
    );

    if (seq.length === 0) {
      return this.getStatus(key, true);
    }

    throw new HealthCheckError(
      'Checkpoints health check failed',
      this.getStatus(key, false, { missing: seq }),
    );
  }
}
