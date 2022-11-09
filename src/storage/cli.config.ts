import { DataSource, DataSourceOptions } from 'typeorm';

// static config object for typeorm cli
const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  migrations: ['src/**/migrations/**/*.ts'],
  entities: ['src/**/*.entity.ts'],
  logging: true,
};

export const ds = new DataSource(config);
