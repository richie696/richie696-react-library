export enum HttpMethod {
  GET = 'GET', POST = 'POST', PUT = 'PUT', PATCH = 'PATCH', DELETE = 'DELETE', HEAD = 'HEAD', OPTIONS = 'OPTIONS',
}

export interface I18nDictionary { readonly [locale: string]: Readonly<Record<string, string>>; }

export interface ApiResult<T> {
  readonly success: boolean; readonly data: T; readonly code: string; readonly message: string;
  readonly requestId?: string; readonly helpUrl?: string; readonly i18n?: I18nDictionary; readonly timestamp?: number;
}

export interface Page<T> { readonly current: number; readonly pages: number; readonly records: readonly T[]; readonly size: number; readonly total: number; }

export interface RequestOptions extends RequestInit {
  readonly query?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  readonly pathParams?: readonly (string | number)[];
  readonly timeoutMs?: number;
  readonly parseEnvelope?: boolean;
  readonly idempotencyKey?: string;
  readonly requestId?: string;
  readonly skipManagedHeaders?: boolean;
}

export interface HttpClientConfig {
  readonly baseUrl?: string;
  readonly clientId?: string;
  readonly duplicateSubmitTimeWindowMs?: number;
  readonly showLoading?: boolean;
  readonly maxRetries?: number;
  readonly retryIntervalMs?: number;
  readonly timeoutMs?: number;
  readonly enableHeaderAutoManagement?: boolean;
  readonly headerStorageKey?: string;
  readonly managedResponseHeaders?: readonly string[];
  readonly persistManagedHeaders?: boolean;
  readonly managedHeadersTtlMs?: number;
  readonly sendHardwareFingerprint?: boolean;
  readonly cryptoExchangePath?: string;
  readonly protocolVersion?: string;
  readonly storage?: import('./storage.js').StorageAdapter;
  readonly onLoadingChange?: (active: boolean) => void;
  readonly onUnauthorized?: (returnTo?: string) => void | Promise<void>;
}
