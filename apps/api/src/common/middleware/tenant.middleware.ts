import { Injectable, Logger, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: any;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    // Skip tenant middleware for auth endpoints
    // Check both req.path and req.originalUrl to handle global prefix
    if (this.isAuthEndpoint(req.path) || this.isAuthEndpoint(req.originalUrl)) {
      return next();
    }

    try {
      const tenantId = this.extractTenantId(req);

      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required. Provide X-Tenant-ID header or valid JWT token.');
      }

      // Store tenant_id in request object for service layer access
      req.tenantId = tenantId;

      // Set PostgreSQL session variable for RLS
      const queryRunner = this.dataSource.createQueryRunner();
      try {
        await queryRunner.connect();
        await queryRunner.query(`SET LOCAL app.current_tenant_id = '${this.escapePostgresString(tenantId)}'`);
        (req as any).queryRunner = queryRunner;
      } catch (error) {
        this.logger.error(`Failed to set tenant context: ${error.message}`);
        throw new ForbiddenException('Invalid tenant context');
      }

      // Clean up after request
      res.on('finish', async () => {
        if ((req as any).queryRunner) {
          await (req as any).queryRunner.release();
        }
      });

      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Tenant middleware error: ${error.message}`);
      throw new ForbiddenException('Failed to process tenant context');
    }
  }

  private extractTenantId(req: TenantRequest): string | null {
    // First, try to get tenant_id from X-Tenant-ID header
    const headerName = this.configService.get<string>('app.tenant.headerName') || 'X-Tenant-ID';
    const headerTenantId = req.get(headerName) as string | undefined;
    if (headerTenantId) {
      return headerTenantId;
    }

    // Second, try to extract from JWT token
    const authHeader = req.get('Authorization') as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwtSecret = this.configService.get<string>('app.jwt.secret');
        const decoded = jwt.verify(token, jwtSecret) as any;
        const tenantClaimName = this.configService.get<string>('app.tenant.jwtClaimName') || 'tenant_id';
        return decoded[tenantClaimName] || null;
      } catch (error) {
        this.logger.debug(`Failed to extract tenant from JWT: ${error.message}`);
      }
    }

    return null;
  }

  private isAuthEndpoint(path: string): boolean {
    const authPaths = [
      '/auth/login', '/auth/register', '/auth/refresh',
      '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh',
      '/health', '/metrics', '/api/docs',
    ];
    return authPaths.some((authPath) => path.startsWith(authPath));
  }

  private escapePostgresString(value: string): string {
    return value.replace(/'/g, "''");
  }
}
