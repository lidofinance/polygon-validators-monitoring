import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';

import * as buildInfo from 'build-info';
import { ConfigService } from 'common/config';
import { PrometheusService } from 'common/prometheus';

import { APP_NAME } from './app.constants';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,

    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const network = this.provider.network.name;
    const env = this.configService.get('NODE_ENV');
    const version = buildInfo.version;
    const commit = buildInfo.commit;
    const branch = buildInfo.branch;
    const name = APP_NAME;

    this.prometheusService.buildInfo
      .labels({ env, network, name, version, commit, branch })
      .inc();

    this.logger.log('Init app', { env, network, name, version });
  }
}
