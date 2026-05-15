import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'aierp'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_NAME', 'aierp'),
    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    subscribers: [path.join(__dirname, '../subscribers/*{.ts,.js}')],
    synchronize: false,
    migrationsRun: true,
    logging: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    logger: 'advanced-console',
    ssl: isProduction
      ? {
          rejectUnauthorized: true,
        }
      : false,
    poolSize: configService.get<number>('DB_POOL_SIZE', 10),
    poolErrorHandler: (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    },
    connectTimeoutMS: configService.get<number>('DB_CONNECT_TIMEOUT', 10000),
    applicationName: 'aierp-api',
    // Support for Row-Level Security (RLS)
    extra: {
      // Enable prepared statements caching
      statement_cache_size: 25,
      statement_timeout: 30000,
      // RLS-specific connection handling
      replication: undefined,
    },
  };
};
