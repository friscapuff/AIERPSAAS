import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS Configuration
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 3600,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Tenant Configuration
  tenant: {
    headerName: 'X-Tenant-ID',
    jwtClaimName: 'tenant_id',
  },

  // Rate Limiting
  rateLimit: {
    ttl: 60,
    limit: parseInt(process.env.RATE_LIMIT, 10) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
}));
