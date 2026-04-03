import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let details = null;

    if (typeof exceptionResponse === 'object') {
      const responseObject = exceptionResponse as any;
      message = responseObject.message || exception.message;
      details = responseObject.error || null;

      if (exception instanceof BadRequestException && Array.isArray(message)) {
        const errors = message as any[];
        details = {
          validation: errors.reduce((acc, error) => {
            if (error.constraints) {
              acc[error.property] = Object.values(error.constraints);
            }
            return acc;
          }, {}),
        };
      }
    }

    const errorResponse: ApiErrorResponse = {
      statusCode: status,
      message,
      error: exceptionResponse instanceof Object ? (exceptionResponse as any).error : exception.name,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && { details }),
    };

    if (status >= 500) {
      this.logger.error(`HTTP Error ${status}: ${message}`, exception.stack);
    } else {
      this.logger.warn(`HTTP Error ${status}: ${message}`);
    }

    response.status(status).json(errorResponse);
  }
}
