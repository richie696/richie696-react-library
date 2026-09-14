export enum AppErrorKind {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  RATE_LIMITED = 'rate-limited',
  SERVER = 'server',
  PROTOCOL = 'protocol',
  DUPLICATE = 'duplicate',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown',
}

export interface AppErrorDetails {
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly responseBody?: unknown;
  readonly traceId?: string;
  readonly cause?: unknown;
}

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly responseBody?: unknown;
  readonly traceId?: string;

  constructor(kind: AppErrorKind, message: string, details: AppErrorDetails = {}) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.status = details.status;
    this.code = details.code;
    this.requestId = details.requestId;
    this.retryAfterMs = details.retryAfterMs;
    this.responseBody = details.responseBody;
    this.traceId = details.traceId;
    if (details.cause !== undefined) this.cause = details.cause;
  }

  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) return error;
    if (hasErrorName(error, TIMEOUT_ERROR_NAME)) return new AppError(AppErrorKind.TIMEOUT, 'The operation timed out', { cause: error });
    if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') return new AppError(AppErrorKind.CANCELLED, 'The request was cancelled', { cause: error });
    if (error instanceof TypeError) return new AppError(AppErrorKind.NETWORK, 'The network request failed', { cause: error });
    return new AppError(AppErrorKind.UNKNOWN, 'An unexpected error occurred', { cause: error });
  }
}

const TIMEOUT_ERROR_NAME = 'TimeoutError';

function hasErrorName(error: unknown, name: string): error is { readonly name: string } {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
}
