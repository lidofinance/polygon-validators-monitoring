import { FallbackProviderModule } from '@lido-nestjs/execution';
import { Global, Module } from '@nestjs/common';

import { ConfigService } from 'common/config';
import { PrometheusService, ResponseStatus } from 'common/prometheus';

import { ProviderService } from './provider.service';

@Global()
@Module({
  imports: [
    FallbackProviderModule.forRootAsync({
      async useFactory(
        configService: ConfigService,
        prometheusService: PrometheusService,
      ) {
        return {
          urls: configService.get('EL_API_URLS'),
          network: configService.get('CHAIN_ID'),
          fetchMiddlewares: [
            async (next, ctx) => {
              const url = ctx?.provider?.connection?.url || 'unknown';
              const hostname = url
                .split('://')
                .pop()
                .split('/')
                .at(0)
                .split(':')
                .at(0);

              const endTimer =
                prometheusService.elRpcRequestDuration.startTimer({
                  provider: hostname,
                });

              try {
                const result = await next();
                endTimer({ status: ResponseStatus.SUCCESS });
                return result;
              } catch (error) {
                endTimer({ status: ResponseStatus.FAILURE });
                throw error;
              }
            },
          ],
        };
      },
      inject: [ConfigService, PrometheusService],
    }),
  ],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
