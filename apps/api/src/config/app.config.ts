import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_TOKEN_SECRET || 'your-refresh-secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  logLevel: process.env.LOG_LEVEL || 'debug',
  logFormat: process.env.LOG_FORMAT || 'json',
  tenantIsolationMode: process.env.TENANT_ISOLATION_MODE || 'rls',
}));
