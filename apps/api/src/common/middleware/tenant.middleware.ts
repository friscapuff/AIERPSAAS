import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.user?.tenantId;

    if (!tenantId) {
      this.logger.warn('No tenant ID provided in request');
    }

    (req as any).tenantId = tenantId;
    next();
  }
}
