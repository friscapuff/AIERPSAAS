// Shared utilities and types
export const APP_VERSION = '1.0.0';
export const API_PREFIX = 'api/v1';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    status: string;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}
