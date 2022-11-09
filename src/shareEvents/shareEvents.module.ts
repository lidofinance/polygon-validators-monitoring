import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventsHubModule, StakingInfoModule } from 'contracts';
import { ShareEvent } from 'storage/entities';
import { ValidatorsModule } from 'validators';

import { ShareEventsService } from './shareEvents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareEvent]),
    StakingInfoModule.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
        return { provider };
      },
    }),
    EventsHubModule.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
        return { provider };
      },
    }),
    ValidatorsModule,
  ],
  providers: [ShareEventsService],
  exports: [ShareEventsService],
})
export class ShareEventModule {}
