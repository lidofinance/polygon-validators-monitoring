import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Module } from '@nestjs/common';

import {
  NodeOperatorsRegistryV1Module,
  NodeOperatorsRegistryV2Module,
  StakeManagerModule,
  StakingNftModule,
} from 'contracts';

import { ValidatorsService } from './validators.service';

@Module({
  imports: [
    StakingNftModule.forFeatureAsync({
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
    NodeOperatorsRegistryV1Module.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
        return { provider };
      },
    }),
    NodeOperatorsRegistryV2Module.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
        return { provider };
      },
    }),
  ],
  providers: [ValidatorsService],
  exports: [ValidatorsService],
})
export class ValidatorsModule {}
