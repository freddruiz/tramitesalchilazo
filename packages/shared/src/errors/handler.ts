import { AppError } from './AppError.js';
import { ErrorCode } from './codes.js';

export interface ApiErrorResponse {
  code: string;
  message: string;
  statusCode: number;
}

export function formatApiError(err: unknown): ApiErrorResponse {
  if (err instanceof AppError) {
    if (err.isOperational) {
      return {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      };
    }
  }

  console.error('Unhandled error:', err);

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}
