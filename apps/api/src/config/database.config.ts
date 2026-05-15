import { registerAs } from '@nestjs/config';
import * as path from 'path';

export const databaseConfig = registerAs('database', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'aierp',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'aierp',
    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    subscribers: [path.join(__dirname, '../subscribers/*{.ts,.js}')],
    synchronize: false,
    migrationsRun: true,
    logging: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    logger: 'advanced-console' as const,
    ssl: isProduction
      ? {
          rejectUnauthorized: true,
        }
      : false,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
    applicationName: 'aierp-api',
    extra: {
      statement_cache_size: 25,
      statement_timeout: 30000,
      replication: undefined,
    },
  };
});
