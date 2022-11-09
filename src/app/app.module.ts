import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from 'common/config';
import { HealthModule } from 'common/health';
import { LoggerModule } from 'common/logger';
import { PrometheusModule } from 'common/prometheus';
import { ProviderModule } from 'common/provider';
import { SentryInterceptor } from 'common/sentry';
import { WorkerModule } from 'worker';

import { AppService } from './app.service';

@Module({
  imports: [
    HealthModule,
    LoggerModule,
    PrometheusModule,
    ConfigModule,
    ProviderModule,
    WorkerModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASS'),
        database: configService.get('DB_NAME'),
        autoLoadEntities: true,
        migrations: ['dist/**/migrations/**/*.js'],
        migrationsRun: true,
        synchronize: false,
        logging: false,
      }),
    }),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: SentryInterceptor },
    AppService,
  ],
})
export class AppModule {}
