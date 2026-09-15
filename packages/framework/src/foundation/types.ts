/** HTTP methods supported by the framework transport. */
export enum HttpMethod {
  GET = 'GET', POST = 'POST', PUT = 'PUT', PATCH = 'PATCH', DELETE = 'DELETE', HEAD = 'HEAD', OPTIONS = 'OPTIONS',
}

/** Localized response messages keyed by locale and message key. */
export interface I18nDictionary { readonly [locale: string]: Readonly<Record<string, string>>; }

/** Standard API response envelope used by the HTTP client. */
export interface ApiResult<T> {
  /** Whether the server accepted the operation. */
  readonly success: boolean;
  /** Typed operation result. */
  readonly data: T;
  /** Stable server result code. */
  readonly code: string;
  /** Human-readable server message. */
  readonly message: string;
  /** Server-generated request correlation identifier. */
  readonly requestId?: string;
  /** Optional help/documentation URL. */
  readonly helpUrl?: string;
  /** Optional localized message dictionary. */
  readonly i18n?: I18nDictionary;
  /** Server response timestamp in milliseconds. */
  readonly timestamp?: number;
}

/** Page metadata and records for list endpoints. */
export interface Page<T> {
  /** One-based current page number. */
  readonly current: number;
  /** Total number of pages. */
  readonly pages: number;
  /** Records on the current page. */
  readonly records: readonly T[];
  /** Requested page size. */
  readonly size: number;
  /** Total records across all pages. */
  readonly total: number;
}

/** Per-request options shared by normal and streaming HTTP calls. */
export interface RequestOptions extends RequestInit {
  /** Query parameters appended to the resolved URL. */
  readonly query?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  /** Positional values used for `{placeholder}` path segments. */
  readonly pathParams?: readonly (string | number)[];
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Whether to parse the standard API envelope. */
  readonly parseEnvelope?: boolean;
  /** Stable key that permits retries for mutating requests. */
  readonly idempotencyKey?: string;
  /** Client-provided request correlation identifier. */
  readonly requestId?: string;
  /** Disables automatic managed-header injection for this request. */
  readonly skipManagedHeaders?: boolean;
}

/** Supplies an opt-in asynchronous HTTP header value, such as a signed device fingerprint. */
export interface RequestHeaderValueProvider {
  getHeaderValue(signal?: AbortSignal): Promise<string>;
}

/** Cross-cutting defaults and callbacks for {@link HttpClient}. */
export interface HttpClientConfig {
  /** Base URL used to resolve relative endpoint paths. */
  readonly baseUrl?: string;
  /** Stable client identifier sent with requests. */
  readonly clientId?: string;
  /** Duplicate submission suppression window in milliseconds. */
  readonly duplicateSubmitTimeWindowMs?: number;
  /** Emits aggregate request loading state changes. */
  readonly showLoading?: boolean;
  /** Maximum retries for retryable requests. */
  readonly maxRetries?: number;
  /** Base retry delay in milliseconds. */
  readonly retryIntervalMs?: number;
  /** Default request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Enables injection of cached allowlisted response headers. */
  readonly enableHeaderAutoManagement?: boolean;
  /** Persistence key for managed response headers. */
  readonly headerStorageKey?: string;
  /** Response header names eligible for managed storage. */
  readonly managedResponseHeaders?: readonly string[];
  /** Persists managed headers through the configured storage adapter. */
  readonly persistManagedHeaders?: boolean;
  /** Managed-header expiration in milliseconds. */
  readonly managedHeadersTtlMs?: number;
  /** Sends a fingerprint provider value, or the legacy stable device ID when no provider is configured. */
  readonly sendHardwareFingerprint?: boolean;
  /** Opt-in provider for a freshly generated hardware fingerprint header. */
  readonly hardwareFingerprintProvider?: RequestHeaderValueProvider;
  /** Header name used for the configured hardware fingerprint provider. */
  readonly hardwareFingerprintHeaderName?: string;
  /** Relative or absolute key-exchange endpoint. */
  readonly cryptoExchangePath?: string;
  /** Gateway protocol version header value. */
  readonly protocolVersion?: string;
  /** Storage adapter used for headers and device identity. */
  readonly storage?: import('./storage.js').StorageAdapter;
  /** Receives aggregate loading state changes. */
  readonly onLoadingChange?: (active: boolean) => void;
  /** Called after a 401 response and managed credential cleanup. */
  readonly onUnauthorized?: (returnTo?: string) => void | Promise<void>;
}
