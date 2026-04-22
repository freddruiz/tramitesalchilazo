import type { ErrorCode } from './codes.js';

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  isOperational: boolean;

  constructor(code: ErrorCode, message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
