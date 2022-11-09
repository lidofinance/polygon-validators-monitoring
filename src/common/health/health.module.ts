import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CheckpointsModule } from 'checkpoints';

import { HealthController } from './health.controller';
import { ProviderHealthIndicator } from './provider.indicator';

@Module({
  providers: [ProviderHealthIndicator],
  controllers: [HealthController],
  imports: [TerminusModule, CheckpointsModule],
})
export class HealthModule {}
