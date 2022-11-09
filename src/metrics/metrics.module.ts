import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CheckpointsModule } from 'checkpoints';
import { Metric } from 'storage/entities';

import { MetricsService } from './metrics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Metric]), CheckpointsModule],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
