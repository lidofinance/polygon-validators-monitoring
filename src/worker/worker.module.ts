import { Module } from '@nestjs/common';

import { CheckpointsModule } from 'checkpoints';
import { MetricsModule } from 'metrics';
import { ShareEventModule } from 'shareEvents';
import { ValidatorsModule } from 'validators';

import { WorkerService } from './worker.service';

@Module({
  imports: [
    CheckpointsModule,
    ShareEventModule,
    ValidatorsModule,
    MetricsModule,
  ],
  providers: [WorkerService],
})
export class WorkerModule {}
