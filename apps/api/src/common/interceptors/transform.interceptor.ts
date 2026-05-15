import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
    statusCode: number;
    itemCount?: number;
    pageCount?: number;
    currentPage?: number;
  };
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;

        // Extract pagination info from headers if available
        const itemCount = response.get('X-Total-Count');
        const pageCount = response.get('X-Page-Count');
        const currentPage = response.get('X-Current-Page');

        const apiResponse: ApiResponse<any> = {
          data,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.path,
            method: request.method,
            statusCode,
            ...(itemCount && { itemCount: parseInt(itemCount, 10) }),
            ...(pageCount && { pageCount: parseInt(pageCount, 10) }),
            ...(currentPage && { currentPage: parseInt(currentPage, 10) }),
          },
        };

        return apiResponse;
      }),
    );
  }
}
