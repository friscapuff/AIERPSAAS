import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'];
    const tenantId = request.headers['x-tenant-id'];
    const userId = request.user?.sub;

    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;

        // Log audit information
        this.logger.log(
          JSON.stringify({
            method,
            url,
            userId,
            tenantId,
            statusCode: context.switchToHttp().getResponse().statusCode,
            duration,
            timestamp: new Date().toISOString(),
          }),
          'AuditLog',
        );
      }),
    );
  }
}
