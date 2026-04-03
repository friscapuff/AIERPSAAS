import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant from multiple sources
    let tenantId =
      req.headers['x-tenant-id'] ||
      req.user?.['tenant_id'] ||
      req.body?.tenant_id;

    if (!tenantId) {
      this.logger.warn(`No tenant ID found for request: ${req.path}`);
    }

    // Set tenant context
    req['tenantId'] = tenantId;

    next();
  }
}
