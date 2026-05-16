import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'aierp',
  synchronize: process.env.NODE_ENV !== 'production',
  migrationsRun: false,
  logging: ['query', 'error', 'warn', 'schema'],
  logger: 'advanced-console',
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
  poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 10000,
  applicationName: 'aierp-api',
  extra: {
    statement_cache_size: 25,
    statement_timeout: 30000,
  },
}));
