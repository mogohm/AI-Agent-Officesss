// Domain error hierarchy. Route handlers / actions map these to safe responses;
// raw messages and stack traces are never returned to clients in production.

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATE"
  | "PROVIDER_CONNECTION"
  | "PROVIDER_RATE_LIMIT"
  | "TASK_EXECUTION"
  | "BUDGET_EXCEEDED"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") { super("UNAUTHENTICATED", message, 401); }
}
export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to do this") { super("FORBIDDEN", message, 403); }
}
export class ValidationError extends AppError {
  constructor(message = "Invalid input", fieldErrors?: Record<string, string[]>) { super("VALIDATION", message, 422, fieldErrors); }
}
export class NotFoundError extends AppError {
  constructor(message = "Not found") { super("NOT_FOUND", message, 404); }
}
export class ConflictError extends AppError {
  constructor(message = "Conflict") { super("CONFLICT", message, 409); }
}
export class InvalidStateTransitionError extends AppError {
  constructor(message = "Invalid state transition") { super("INVALID_STATE", message, 409); }
}
export class ProviderConnectionError extends AppError {
  constructor(message = "Provider connection failed") { super("PROVIDER_CONNECTION", message, 502); }
}
export class ProviderRateLimitError extends AppError {
  constructor(message = "Provider rate limit") { super("PROVIDER_RATE_LIMIT", message, 429); }
}
export class TaskExecutionError extends AppError {
  constructor(message = "Task execution failed") { super("TASK_EXECUTION", message, 500); }
}
export class BudgetExceededError extends AppError {
  constructor(message = "Budget exceeded") { super("BUDGET_EXCEEDED", message, 402); }
}
export class RateLimitError extends AppError {
  constructor(message = "Too many requests") { super("RATE_LIMITED", message, 429); }
}

export function toSafeError(err: unknown): { code: ErrorCode; message: string; status: number; fieldErrors?: Record<string, string[]> } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, status: err.status, fieldErrors: err.fieldErrors };
  }
  // Never leak internal messages/stack traces.
  return { code: "INTERNAL", message: "An unexpected error occurred", status: 500 };
}
