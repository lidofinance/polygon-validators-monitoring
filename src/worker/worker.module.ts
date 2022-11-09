import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CheckpointsModule } from 'checkpoints';
import { MetricsModule } from 'metrics';
import { ShareEventModule } from 'shareEvents';
import { Duty, Metric, ShareEvent } from 'storage/entities';
import { ValidatorsModule } from 'validators';

import { WorkerService } from './worker.service';

@Module({
  imports: [
    CheckpointsModule,
    ShareEventModule,
    ValidatorsModule,
    MetricsModule,
    TypeOrmModule.forFeature([Duty, Metric, ShareEvent]),
  ],
  providers: [WorkerService],
})
export class WorkerModule {}
