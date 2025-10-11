// Authentication error types and handlers
export enum AuthErrorCode {
  // User registration errors
  USER_EXISTS = "USER_EXISTS",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_PASSWORD = "INVALID_PASSWORD",

  // User login errors
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  PASSWORD_MISMATCH = "PASSWORD_MISMATCH",

  // Email verification errors
  EMAIL_ALREADY_VERIFIED = "EMAIL_ALREADY_VERIFIED",
  VERIFICATION_TOKEN_EXPIRED = "VERIFICATION_TOKEN_EXPIRED",
  INVALID_VERIFICATION_TOKEN = "INVALID_VERIFICATION_TOKEN",

  // Password reset errors
  INVALID_RESET_TOKEN = "INVALID_RESET_TOKEN",
  RESET_TOKEN_EXPIRED = "RESET_TOKEN_EXPIRED",
  PASSWORD_RESET_DISABLED = "PASSWORD_RESET_DISABLED",

  // Session errors
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_SESSION = "INVALID_SESSION",

  // General errors
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  INVALID_REQUEST = "INVALID_REQUEST",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: AuthErrorCode,
    statusCode: number = 400,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

// Create specific error types for better type safety
export class UserExistsError extends AuthError {
  constructor(email: string) {
    super(`User with email ${email} already exists`, AuthErrorCode.USER_EXISTS, 409);
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("Invalid email or password", AuthErrorCode.INVALID_CREDENTIALS, 401);
  }
}

export class VerificationTokenExpiredError extends AuthError {
  constructor() {
    super("Verification token has expired", AuthErrorCode.VERIFICATION_TOKEN_EXPIRED, 410);
  }
}

export class ResetTokenExpiredError extends AuthError {
  constructor() {
    super("Password reset token has expired", AuthErrorCode.RESET_TOKEN_EXPIRED, 410);
  }
}

export class RateLimitError extends AuthError {
  constructor() {
    super("Too many attempts, please try again later", AuthErrorCode.RATE_LIMIT_EXCEEDED, 429);
  }
}

// Error handling utilities
export const handleAuthError = (error: unknown): AuthError => {
  // If it's already an AuthError, return it
  if (error instanceof AuthError) {
    return error;
  }

  // Handle Zod validation errors
  if (error instanceof Error && error.name === "ZodError") {
    return new AuthError(
      "Invalid input data",
      AuthErrorCode.INVALID_REQUEST,
      400
    );
  }

  // Handle Prisma errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("unique constraint")) {
      return new UserExistsError("");
    }

    if (message.includes("not found")) {
      return new AuthError(
        "Resource not found",
        AuthErrorCode.USER_NOT_FOUND,
        404
      );
    }
  }

  // Default error for unknown issues
  console.error("Unhandled authentication error:", error);
  return new AuthError(
    "An unexpected error occurred",
    AuthErrorCode.INTERNAL_ERROR,
    500
  );
};

// Log authentication events for security monitoring
export const logAuthEvent = (
  event: string,
  data: Record<string, any>,
  level: "info" | "warn" | "error" = "info"
): void => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    data,
    level,
  };

  // In development, log to console
  if (process.env.NODE_ENV === "development") {
    console.log(`[AUTH-${level.toUpperCase()}]`, logEntry);
  }

  // TODO: In production, send to logging service
  // Example: await loggingService.log(logEntry);
};

// Log security events with higher priority
export const logSecurityEvent = (
  event: string,
  data: Record<string, any>
): void => {
  logAuthEvent(event, data, "warn");

  // TODO: In production, send to security monitoring service
  // Example: await securityService.alert(event, data);
};

// Create standardized API response
export const createAuthResponse = (
  success: boolean,
  data?: any,
  error?: AuthError,
  meta?: Record<string, any>
) => {
  return {
    success,
    data: success ? data : undefined,
    error: !success && error ? {
      code: error.code,
      message: error.message,
    } : undefined,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      ...meta,
    },
  };
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 100) {
    errors.push("Password must not exceed 100 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};