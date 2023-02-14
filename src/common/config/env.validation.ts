import { NonEmptyArray } from '@lido-nestjs/execution';
import { Transform, plainToClass } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

import { Environment, LogFormat, LogLevel } from './interfaces';

const toNumber =
  ({ defaultValue }) =>
  ({ value }) => {
    if (value === '' || value == null) return defaultValue;
    return Number(value);
  };

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.development;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(toNumber({ defaultValue: 3000 }))
  PORT!: number;

  @IsNotEmpty()
  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Transform(toNumber({ defaultValue: 5432 }))
  DB_PORT: number;

  @IsNotEmpty()
  @IsString()
  DB_USER: string;

  @IsNotEmpty()
  @IsString()
  DB_PASS: string;

  @IsNotEmpty()
  @IsString()
  DB_NAME: string;

  @IsOptional()
  @IsNumber()
  @Transform(toNumber({ defaultValue: 0 }))
  START_BLOCK!: number;

  @IsOptional()
  @IsString()
  SENTRY_DSN: string | null = null;

  @IsOptional()
  @IsEnum(LogLevel)
  @Transform(({ value }) => value || LogLevel.info)
  LOG_LEVEL!: LogLevel;

  @IsOptional()
  @IsEnum(LogFormat)
  @Transform(({ value }) => value || LogFormat.json)
  LOG_FORMAT!: LogFormat;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.split(','))
  EL_API_URLS!: NonEmptyArray<string>;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  CHAIN_ID!: number;

  @IsArray()
  @Transform(({ value }) =>
    value
      .split(',')
      .filter(Boolean)
      .map((v: string) => Number(v)),
  )
  @IsOptional()
  TRACKED_IDS: number[];

  @IsArray()
  @Transform(({ value }) =>
    value
      .split(',')
      .filter(Boolean)
      .map((v: string) => v),
  )
  @IsOptional()
  DELEGATORS: string[];

  @IsOptional()
  @IsString()
  WORKER_UPDATE_CRON = '*/12 * * * * *';

  @IsOptional()
  @IsString()
  METRICS_RETENTION_CRON = '0 */1 * * *';

  @IsOptional()
  @IsString()
  STAKE_EVENTS_CRON = '0 */1 * * *';

  @IsNotEmpty()
  @IsString()
  MONIKERS_JSON = './monikers.json';

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  DRY_RUN = false;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config);

  const validatorOptions = { skipMissingProperties: false };
  const errors = validateSync(validatedConfig, validatorOptions);

  if (errors.length > 0) {
    console.error(errors.toString());
    process.exit(1);
  }

  return validatedConfig;
}
