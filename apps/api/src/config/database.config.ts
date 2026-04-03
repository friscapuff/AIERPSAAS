import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'aierp',
  schema: process.env.DB_SCHEMA || 'public',
  entities: ['dist/libs/database/src/entities/**/*.entity.js'],
  migrations: ['dist/apps/api/src/database/migrations/**/*.js'],
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  logging: process.env.DB_LOGGING === 'true',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  dropSchema: false,
  connectTimeoutMS: 10000,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
}));
