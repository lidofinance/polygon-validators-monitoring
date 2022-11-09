import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JackModule, RootChainModule } from 'contracts';
import { Checkpoint, Duty } from 'storage/entities';
import { ValidatorsModule } from 'validators';

import { CheckpointsHealthIndicator } from './checkpoints.health';
import { CheckpointsService } from './checkpoints.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Checkpoint, Duty]),
    RootChainModule.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
        return { provider };
      },
    }),
    JackModule.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
        return { provider };
      },
    }),
    ValidatorsModule,
  ],
  providers: [CheckpointsService, CheckpointsHealthIndicator],
  exports: [CheckpointsService, CheckpointsHealthIndicator],
})
export class CheckpointsModule {}
