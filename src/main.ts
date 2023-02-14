import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as Sentry from '@sentry/node';

import { APP_NAME, AppModule } from 'app';
import * as buildInfo from 'build-info';
import { ConfigService } from 'common/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bufferLogs: true },
  );

  // config
  const configService: ConfigService = app.get(ConfigService);
  const environment = configService.get('NODE_ENV');
  const appPort = configService.get('PORT');
  const sentryDsn = configService.get('SENTRY_DSN') ?? undefined;

  // logger
  const logger = app.get(LOGGER_PROVIDER);
  app.useLogger(logger);

  // sentry
  if (sentryDsn) {
    const release = `${APP_NAME}@${buildInfo.version}`;
    Sentry.init({ dsn: sentryDsn, release, environment });
  }

  process.on('unhandledRejection', async (error: Error) => {
    logger.warn(
      "Dangling promise rejection detected. It's not handled anywhere.",
    );
    logger.error(error.message, error.stack);
    process.exit(1);
  });

  // app
  await app.listen(appPort, '0.0.0.0');
}

bootstrap();
