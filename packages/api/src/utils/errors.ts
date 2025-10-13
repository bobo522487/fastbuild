import { TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { logger, logTRPCError } from './logger';

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, ErrorCode.NOT_FOUND, 404, true, { resource, identifier });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, ErrorCode.UNAUTHORIZED, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, ErrorCode.FORBIDDEN, 403, true);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, 400, true, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATABASE_ERROR, 500, false, context);
  }
}

// Error conversion utilities
export function convertToTRPCError(error: unknown, context?: Record<string, any>): TRPCError {
  // Log the error
  logTRPCError(error as TRPCError, context);

  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof AppError) {
    return new TRPCError({
      code: getTRPCErrorCode(error.statusCode),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof ZodError) {
    logger.warn({
      issues: error.issues,
      context
    }, 'Validation error');

    return new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      cause: error,
    });
  }

  if (error instanceof Error) {
    logger.error({
      message: error.message,
      stack: error.stack,
      context
    }, 'Unexpected error');

    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      cause: error,
    });
  }

  logger.error({
    error: String(error),
    context
  }, 'Unknown error type');

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

function getTRPCErrorCode(statusCode: number): TRPCError['code'] {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 500:
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

// Error handling middleware
export function createErrorHandler(context?: Record<string, any>) {
  return ({ error }: { error: unknown }) => {
    const trpcError = convertToTRPCError(error, context);

    return {
      error: {
        ...trpcError,
        code: trpcError.code,
        message: trpcError.message,
        // Include stack trace in development
        ...(process.env.NODE_ENV === 'development' && {
          stack: trpcError.stack,
        }),
      },
    };
  };
}

// Async error wrapper
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Let the error bubble up to tRPC error handler
      throw error;
    }
  };
}