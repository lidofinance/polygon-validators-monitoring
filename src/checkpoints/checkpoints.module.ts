import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JackModule, RootChainModule, StakeManagerModule } from 'contracts';
import { Checkpoint, Duty, Reward } from 'storage/entities';
import { ValidatorsModule } from 'validators';

import { CheckpointsHealthIndicator } from './checkpoints.health';
import { CheckpointsService } from './checkpoints.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Checkpoint, Duty, Reward]),
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
    StakeManagerModule.forFeatureAsync({
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
