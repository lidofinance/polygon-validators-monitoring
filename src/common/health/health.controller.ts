import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { CheckpointsHealthIndicator } from 'checkpoints';

import { HEALTH_URL, MAX_MEMORY_HEAP } from './health.constants';
import { ProviderHealthIndicator } from './provider.indicator';

@Controller(HEALTH_URL)
export class HealthController {
  constructor(
    protected readonly checkpoints: CheckpointsHealthIndicator,
    protected readonly provider: ProviderHealthIndicator,
    protected readonly memory: MemoryHealthIndicator,
    protected readonly health: HealthCheckService,
    protected readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.memory.checkHeap('memoryHeap', MAX_MEMORY_HEAP),
      async () => this.provider.isHealthy('RPCProvider'),
      async () => this.checkpoints.isHealthy('checkpoints'),
      async () => this.db.pingCheck('database'),
    ]);
  }
}
