export type ErrorCode =
  | 'AUTH_UNAUTHENTICATED'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  | 'AUTH_STEP_UP_REQUIRED'
  | 'AUTH_STEP_UP_LOCKED'
  | 'PROFILE_VALIDATION'
  | 'PROFILE_DUPLICATE_DPI'
  | 'PROFILE_ALREADY_COMPLETE'
  | 'RATE_LIMIT_EXCEEDED';

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
