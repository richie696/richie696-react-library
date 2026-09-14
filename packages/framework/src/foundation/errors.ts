/** Stable categories used by framework services for error handling and UI state. */
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

/** Optional transport and correlation metadata attached to an {@link AppError}. */
export interface AppErrorDetails {
  /** HTTP status associated with the failure. */
  readonly status?: number;
  /** Stable server or client error code. */
  readonly code?: string;
  /** Request correlation identifier. */
  readonly requestId?: string;
  /** Server-advised retry delay in milliseconds. */
  readonly retryAfterMs?: number;
  /** Sanitized response payload, when available. */
  readonly responseBody?: unknown;
  /** Distributed trace identifier. */
  readonly traceId?: string;
  /** Original cause retained for diagnostics. */
  readonly cause?: unknown;
}

/** Normalized application error that is safe to expose at a service boundary. */
export class AppError extends Error {
  /** Stable category used by callers for recovery and presentation. */
  readonly kind: AppErrorKind;
  /** HTTP status when the error came from a response. */
  readonly status?: number;
  /** Stable server or client code. */
  readonly code?: string;
  /** Request correlation identifier. */
  readonly requestId?: string;
  /** Server-advised retry delay in milliseconds. */
  readonly retryAfterMs?: number;
  /** Sanitized response payload. */
  readonly responseBody?: unknown;
  /** Distributed trace identifier. */
  readonly traceId?: string;

  /** Creates an error with a stable kind and optional protocol metadata. */
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

  /** Converts an arbitrary thrown value into an {@link AppError}. */
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
