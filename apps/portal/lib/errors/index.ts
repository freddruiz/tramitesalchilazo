export type ErrorCode =
  | 'AUTH_UNAUTHENTICATED'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  | 'AUTH_STEP_UP_REQUIRED';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}
