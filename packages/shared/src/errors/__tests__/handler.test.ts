import { describe, it, expect, vi } from 'vitest';
import { AppError, formatApiError, ErrorCode } from '../index.js';

describe('Error Handler', () => {
  describe('formatApiError', () => {
    it('should return operational error code and message', () => {
      const err = new AppError(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid username or password',
        401,
        true
      );

      const result = formatApiError(err);

      expect(result).toEqual({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid username or password',
        statusCode: 401,
      });
    });

    it('should hide non-operational error message', () => {
      const err = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Database connection failed at 192.168.1.1:5432',
        500,
        false
      );

      const result = formatApiError(err);

      expect(result).toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        statusCode: 500,
      });
    });

    it('should log non-operational errors server-side', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Secret internal error',
        500,
        false
      );

      formatApiError(err);

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled error:', err);
      consoleSpy.mockRestore();
    });

    it('should handle unknown error types', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unknownErr = new Error('Some unknown error');

      const result = formatApiError(unknownErr);

      expect(result).toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        statusCode: 500,
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should never expose stack traces', () => {
      const err = new Error('Stack trace with file paths');
      const result = formatApiError(err);

      expect(result.message).not.toContain('/');
      expect(result.message).not.toContain('\\');
      expect(result.message).not.toContain('.ts');
      expect(result.message).not.toContain('.js');
    });

    it('should handle null or undefined errors', () => {
      const result = formatApiError(null);
      expect(result).toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        statusCode: 500,
      });
    });
  });

  describe('AppError', () => {
    it('should create error with default isOperational=true', () => {
      const err = new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid input', 400);
      expect(err.isOperational).toBe(true);
    });

    it('should create error with isOperational=false', () => {
      const err = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Internal error',
        500,
        false
      );
      expect(err.isOperational).toBe(false);
    });

    it('should be instanceof AppError', () => {
      const err = new AppError(ErrorCode.AUTH_TOKEN_EXPIRED, 'Token expired', 401);
      expect(err instanceof AppError).toBe(true);
      expect(err instanceof Error).toBe(true);
    });

    it('should have correct error name', () => {
      const err = new AppError(ErrorCode.PROFILE_INCOMPLETE, 'Profile incomplete', 400);
      expect(err.name).toBe('AppError');
    });
  });
});
