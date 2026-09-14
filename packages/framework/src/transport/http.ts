import { EccCryptoSession } from '../foundation/crypto.js';
import { DuplicateRequestGuard } from '../foundation/duplicate.js';
import { AppError, AppErrorKind } from '../foundation/errors.js';
import { ManagedHeadersStore } from '../foundation/headers.js';
import { DeviceIdentity } from '../foundation/identity.js';
import { BrowserStorage, MemoryStorage } from '../foundation/storage.js';
import { HttpMethod, type ApiResult, type HttpClientConfig, type RequestOptions } from '../foundation/types.js';
import { Url } from '../foundation/url.js';
import { parseEventStream, type ServerSentEventMessage } from './sse.js';

/** Intercepts and optionally replaces an outgoing request. */
export type RequestInterceptor = (request: Request) => Request | Promise<Request>;
/** Intercepts and optionally replaces an incoming response. */
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
/** Options specific to server-sent event requests. */
export interface StreamOptions extends RequestOptions {
  /** Optional gateway intent header. */
  readonly intent?: string;
  /** Converts each parsed SSE payload before yielding it. */
  readonly parseData?: (data: unknown, event: ServerSentEventMessage<unknown>) => unknown;
}
/** Construction options for the framework HTTP client. */
export interface HttpClientOptions extends HttpClientConfig {
  /** Fetch implementation used by the client. */
  readonly fetch?: typeof fetch;
  /** Ordered outgoing request interceptors. */
  readonly requestInterceptors?: readonly RequestInterceptor[];
  /** Ordered incoming response interceptors. */
  readonly responseInterceptors?: readonly ResponseInterceptor[];
  /** Legacy alias used when `timeoutMs` is not set. */
  readonly defaultTimeoutMs?: number;
}

const RETRYABLE_METHODS = new Set([HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS]);
const RETRYABLE_STATUSES = new Set([408, 425, 429]);
const DEFAULT_HEADERS = ['x-rd-request-apitoken'];
const MAX_RETRY_DELAY_MS = 30_000;

/** Fetch-based HTTP service with retries, cancellation and cross-cutting policy hooks. */
export class HttpClient {
  private config: Required<Pick<HttpClientConfig, 'baseUrl' | 'clientId' | 'duplicateSubmitTimeWindowMs' | 'showLoading' | 'maxRetries' | 'retryIntervalMs' | 'timeoutMs' | 'enableHeaderAutoManagement' | 'headerStorageKey' | 'persistManagedHeaders' | 'managedHeadersTtlMs' | 'sendHardwareFingerprint' | 'cryptoExchangePath' | 'protocolVersion'>> & HttpClientConfig;
  private readonly fetcher: typeof fetch;
  private readonly requestInterceptors: readonly RequestInterceptor[];
  private readonly responseInterceptors: readonly ResponseInterceptor[];
  private readonly duplicateGuard: DuplicateRequestGuard;
  private readonly managedHeaders: ManagedHeadersStore;
  private readonly deviceIdentity: DeviceIdentity;
  private readonly cryptoSession = new EccCryptoSession();
  private loadingCount = 0;

  /** Creates an HTTP client using standard host APIs and injectable adapters. */
  constructor(options: HttpClientOptions = {}) {
    const storage = options.storage ?? (typeof window !== 'undefined' ? new BrowserStorage() : new MemoryStorage());
    this.config = { ...options, baseUrl: options.baseUrl ?? '', clientId: options.clientId ?? createClientId(), duplicateSubmitTimeWindowMs: options.duplicateSubmitTimeWindowMs ?? 3_000, showLoading: options.showLoading ?? true, maxRetries: options.maxRetries ?? 3, retryIntervalMs: options.retryIntervalMs ?? 1_000, timeoutMs: options.timeoutMs ?? options.defaultTimeoutMs ?? 30_000, enableHeaderAutoManagement: options.enableHeaderAutoManagement ?? true, headerStorageKey: options.headerStorageKey ?? 'http_headers', persistManagedHeaders: options.persistManagedHeaders ?? true, managedHeadersTtlMs: options.managedHeadersTtlMs ?? 5 * 60 * 1_000, sendHardwareFingerprint: options.sendHardwareFingerprint ?? false, cryptoExchangePath: options.cryptoExchangePath ?? '/api/crypto/exchange', protocolVersion: options.protocolVersion ?? '1' };
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.requestInterceptors = options.requestInterceptors ?? [];
    this.responseInterceptors = options.responseInterceptors ?? [];
    this.duplicateGuard = new DuplicateRequestGuard(this.config.duplicateSubmitTimeWindowMs);
    this.managedHeaders = new ManagedHeadersStore({ storage, storageKey: this.config.headerStorageKey, persist: this.config.persistManagedHeaders, ttlMs: this.config.managedHeadersTtlMs, allowlist: options.managedResponseHeaders ?? DEFAULT_HEADERS });
    this.deviceIdentity = new DeviceIdentity(storage);
    void this.managedHeaders.load();
  }

  /** Executes a request and returns the normalized API envelope. */
  async request<T>(url: Url | string, body?: unknown, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const endpoint = this.resolveEndpoint(url, body, options);
    const method = this.resolveMethod(url, options);
    const duplicateKey = url instanceof Url && url.needDuplicateCheck ? await this.duplicateGuard.key(endpoint, method, body, this.currentUserId()) : undefined;
    if (duplicateKey && this.duplicateGuard.isDuplicate(duplicateKey)) throw new AppError(AppErrorKind.DUPLICATE, 'Duplicate request rejected');
    if (duplicateKey) this.duplicateGuard.record(duplicateKey);
    return this.executeWithRetry<T>(endpoint, method, body, url, options);
  }

  /** Executes a request and returns only its data payload. */
  async requestData<T>(url: Url | string, body?: unknown, options: RequestOptions = {}): Promise<T> { return (await this.request<T>(url, body, options)).data; }

  /** Streams parsed SSE data frames until completion or cancellation. */
  async *requestStream<T>(url: Url | string, body?: unknown, options: StreamOptions = {}): AsyncGenerator<T> {
    const endpoint = this.resolveEndpoint(url, body, options); const method = this.resolveMethod(url, options); const controller = new AbortController(); const detach = connectAbort(options.signal, controller); this.setLoading(true);
    try {
      const headers = await this.prepareHeaders(options, true); if (!headers.has('accept')) headers.set('accept', 'text/event-stream'); if (options.intent) headers.set('x-rydeen-agent-intent', options.intent);
      const request = await this.applyRequestInterceptors(new Request(endpoint, { ...options, method, headers, body: encodeBody(methodAllowsBody(method) ? body : undefined, headers), signal: controller.signal }));
      let response = await this.fetcher(request); response = await this.applyResponseInterceptors(response); this.managedHeaders.capture(response.headers); if (!response.ok) throw await this.httpError(response, options.requestId);
      for await (const event of parseEventStream<unknown>(response, controller.signal)) {
        if (event.data && typeof event.data === 'object' && 'kind' in event.data) { const envelope = event.data as { kind?: unknown; error?: unknown }; if (envelope.kind === 'done') return; if (envelope.kind === 'error') throw new AppError(AppErrorKind.PROTOCOL, 'The event stream reported an error', { responseBody: envelope.error }); }
        yield (options.parseData ? options.parseData(event.data, event) : event.data) as T;
      }
    } catch (error) { throw AppError.fromUnknown(error); } finally { detach(); controller.abort(); this.setLoading(false); }
  }

  /** Applies mutable operational defaults to subsequent requests. */
  updateConfig(config: Partial<HttpClientConfig>): void { this.config = { ...this.config, ...config }; if (config.duplicateSubmitTimeWindowMs !== undefined) this.duplicateGuard.updateTimeWindow(config.duplicateSubmitTimeWindowMs); }
  /** Performs the configured gateway key exchange for encrypted endpoints. */
  async initializeEncryption(): Promise<void> { await this.cryptoSession.exchange(this.config.baseUrl, this.config.clientId, this.config.cryptoExchangePath, this.config.protocolVersion, this.fetcher); }
  /** Reads a cached allowlisted response header. */
  getManagedHeader(name: string): string | null { return this.managedHeaders.get(name); }
  /** Clears all cached managed response headers. */
  clearManagedHeaders(): void { this.managedHeaders.clear(); }
  /** Indicates whether one or more requests are currently in flight. */
  get loading(): boolean { return this.loadingCount > 0; }
  /** Releases encryption, deduplication and managed-header state. */
  cleanup(): void { this.cryptoSession.clear(); this.duplicateGuard.clearAll(); this.managedHeaders.clear(); }

  private async executeWithRetry<T>(endpoint: string, method: HttpMethod, body: unknown, url: Url | string, options: RequestOptions): Promise<ApiResult<T>> {
    const canRetry = RETRYABLE_METHODS.has(method) || Boolean(options.idempotencyKey); const attempts = canRetry ? Math.max(0, this.config.maxRetries) + 1 : 1; let lastError: AppError | undefined; let rehandshaken = false;
    for (let attempt = 0; attempt < attempts; attempt += 1) { try { return await this.executeOnce<T>(endpoint, method, body, url, options); } catch (error) { lastError = AppError.fromUnknown(error); if (!rehandshaken && url instanceof Url && url.needEncryption && lastError.status === 423 && isRecord(lastError.responseBody) && typeof lastError.responseBody.keyId === 'string' && typeof lastError.responseBody.gatewayPublicKey === 'string') { await this.cryptoSession.reHandshake(lastError.responseBody.keyId, lastError.responseBody.gatewayPublicKey); rehandshaken = true; attempt -= 1; continue; } if (attempt >= attempts - 1 || !this.isRetryable(lastError)) throw lastError; await delay(this.retryDelay(lastError, attempt), options.signal ?? undefined); } }
    throw lastError ?? new AppError(AppErrorKind.UNKNOWN, 'Request failed');
  }

  private async executeOnce<T>(endpoint: string, method: HttpMethod, body: unknown, url: Url | string, options: RequestOptions): Promise<ApiResult<T>> {
    const controller = new AbortController(); const timeoutMs = options.timeoutMs ?? this.config.timeoutMs; let timedOut = false; const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs); const detach = connectAbort(options.signal, controller); this.setLoading(true);
    try {
      let requestBody = body; const headers = await this.prepareHeaders(options);
      if (url instanceof Url && url.needEncryption && requestBody !== undefined && method !== HttpMethod.GET) { if (!this.cryptoSession.initialized) await this.initializeEncryption(); requestBody = await this.cryptoSession.encrypt(serializeBody(requestBody)); headers.set('content-type', 'application/octet-stream'); headers.set('x-encrypted-data', 'body-v1'); if (this.cryptoSession.gatewayKeyId) headers.set('x-gateway-keyid', this.cryptoSession.gatewayKeyId); }
      const request = await this.applyRequestInterceptors(new Request(endpoint, { ...options, method, headers, body: encodeBody(methodAllowsBody(method) ? requestBody : undefined, headers), signal: controller.signal })); let response = await this.fetcher(request); response = await this.applyResponseInterceptors(response); this.managedHeaders.capture(response.headers);
      if (response.status === 401) await this.handleUnauthorized(options); if (!response.ok) throw await this.httpError(response, options.requestId); const payload = await readPayload(response); const decrypted = url instanceof Url && url.needEncryption && typeof payload === 'string' && response.headers.get('x-response-encrypted') === 'true' ? JSON.parse(await this.cryptoSession.decrypt(payload)) : payload; return this.toApiResult<T>(decrypted, response, options.parseEnvelope !== false);
    } catch (error) { if (timedOut) throw new AppError(AppErrorKind.TIMEOUT, 'The request timed out', { cause: error }); if (options.signal?.aborted) throw new AppError(AppErrorKind.CANCELLED, 'The request was cancelled', { cause: error }); throw AppError.fromUnknown(error); } finally { clearTimeout(timeout); detach(); this.setLoading(false); }
  }

  private resolveEndpoint(url: Url | string, body: unknown, options: RequestOptions): string { const pathParams = options.pathParams ?? (Array.isArray(body) ? body as readonly (string | number)[] : []); const method = options.method ?? (url instanceof Url ? url.method : HttpMethod.GET); const query = Array.isArray(body) ? undefined : options.query ?? (method === HttpMethod.GET && isRecord(body) ? body as Readonly<Record<string, string | number | boolean | null | undefined>> : undefined); const endpoint = typeof url === 'string' ? appendQuery(url, query) : url.resolve(pathParams, { ...options, query }); const base = this.config.baseUrl || (typeof location !== 'undefined' ? location.origin : undefined); return new URL(endpoint, base).toString(); }
  private resolveMethod(url: Url | string, options: RequestOptions): HttpMethod { return (options.method ?? (url instanceof Url ? url.method : HttpMethod.GET)) as HttpMethod; }
  private async prepareHeaders(options: RequestOptions, stream = false): Promise<Headers> { const headers = new Headers(options.headers); if (!options.skipManagedHeaders && this.config.enableHeaderAutoManagement) this.managedHeaders.snapshot().forEach((value, name) => { if (!headers.has(name)) headers.set(name, value); }); if (!headers.has('x-client-timestamp')) headers.set('x-client-timestamp', String(Date.now())); if (!headers.has('x-gateway-protocol-version')) headers.set('x-gateway-protocol-version', this.config.protocolVersion); if (!headers.has('x-client-id')) headers.set('x-client-id', this.config.clientId); if (options.requestId && !headers.has('x-request-id')) headers.set('x-request-id', options.requestId); if (options.idempotencyKey && !headers.has('idempotency-key')) headers.set('idempotency-key', options.idempotencyKey); const userId = this.currentUserId(); if (userId && !headers.has('x-user-id')) headers.set('x-user-id', userId); if (this.config.sendHardwareFingerprint && !headers.has('x-device-id')) headers.set('x-device-id', await this.deviceIdentity.getOrCreate()); if (stream && !headers.has('cache-control')) headers.set('cache-control', 'no-cache'); return headers; }
  private async applyRequestInterceptors(request: Request): Promise<Request> { let current = request; for (const interceptor of this.requestInterceptors) current = await interceptor(current); return current; }
  private async applyResponseInterceptors(response: Response): Promise<Response> { let current = response; for (const interceptor of this.responseInterceptors) current = await interceptor(current); return current; }
  private async httpError(response: Response, requestId?: string): Promise<AppError> { const responseBody = await readPayload(response); const retryAfterMs = parseRetryAfter(response.headers.get('retry-after')); const kind = response.status === 401 ? AppErrorKind.UNAUTHORIZED : response.status === 403 ? AppErrorKind.FORBIDDEN : response.status === 429 ? AppErrorKind.RATE_LIMITED : response.status >= 500 ? AppErrorKind.SERVER : AppErrorKind.PROTOCOL; const body = isRecord(responseBody) ? responseBody : undefined; return new AppError(kind, typeof body?.message === 'string' ? body.message : `HTTP request failed with status ${response.status}`, { status: response.status, code: typeof body?.code === 'string' ? body.code : undefined, requestId: typeof body?.requestId === 'string' ? body.requestId : requestId, traceId: typeof body?.traceId === 'string' ? body.traceId : response.headers.get('x-trace-id') ?? undefined, retryAfterMs, responseBody }); }
  private toApiResult<T>(payload: unknown, response: Response, parseEnvelope: boolean): ApiResult<T> { if (parseEnvelope && isRecord(payload) && typeof payload.success === 'boolean' && 'data' in payload) { if (!payload.success) throw new AppError(AppErrorKind.PROTOCOL, typeof payload.message === 'string' ? payload.message : 'The server returned an unsuccessful result', { code: typeof payload.code === 'string' ? payload.code : undefined, requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined, responseBody: payload }); return payload as unknown as ApiResult<T>; } return { success: true, data: payload as T, code: String(response.status), message: response.statusText || 'OK', requestId: response.headers.get('x-request-id') ?? undefined }; }
  private isRetryable(error: AppError): boolean { return error.kind === AppErrorKind.NETWORK || error.kind === AppErrorKind.TIMEOUT || error.kind === AppErrorKind.RATE_LIMITED || error.kind === AppErrorKind.SERVER || (error.status !== undefined && RETRYABLE_STATUSES.has(error.status)); }
  private retryDelay(error: AppError, attempt: number): number { return Math.min(MAX_RETRY_DELAY_MS, error.retryAfterMs ?? this.config.retryIntervalMs * (2 ** attempt)); }
  private currentUserId(): string | null { return typeof localStorage !== 'undefined' ? localStorage.getItem('user_id') : null; }
  private async handleUnauthorized(options: RequestOptions): Promise<void> { this.clearManagedHeaders(); await this.config.onUnauthorized?.(options.requestId); }
  private setLoading(active: boolean): void { if (!this.config.showLoading) return; this.loadingCount = Math.max(0, this.loadingCount + (active ? 1 : -1)); this.config.onLoadingChange?.(this.loadingCount > 0); }
}

/** Semantic alias for clients that communicate with an Atlas gateway. */
export class GatewayClient extends HttpClient {}

function createClientId(): string { return globalThis.crypto?.randomUUID?.() ? `client_${globalThis.crypto.randomUUID()}` : `client_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function serializeBody(value: unknown): string { return typeof value === 'string' ? value : JSON.stringify(value); }
function encodeBody(body: unknown, headers: Headers): BodyInit | undefined { if (body === undefined || body === null) return undefined; if (typeof body === 'string' || body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || body instanceof URLSearchParams) return body; if (!headers.has('content-type')) headers.set('content-type', 'application/json'); return JSON.stringify(body); }
function methodAllowsBody(method: HttpMethod): boolean { return method !== HttpMethod.GET && method !== HttpMethod.HEAD && method !== HttpMethod.OPTIONS; }
async function readPayload(response: Response): Promise<unknown> { if (response.status === 204) return undefined; const text = await response.text(); if (!text) return undefined; try { return JSON.parse(text) as unknown; } catch { return text; } }
function parseRetryAfter(value: string | null): number | undefined { if (!value) return undefined; const seconds = Number(value); if (Number.isFinite(seconds)) return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, seconds * 1_000)); const date = Date.parse(value); return Number.isFinite(date) ? Math.min(MAX_RETRY_DELAY_MS, Math.max(0, date - Date.now())) : undefined; }
function delay(milliseconds: number, signal?: AbortSignal): Promise<void> { return new Promise((resolve, reject) => { if (signal?.aborted) { reject(new AppError(AppErrorKind.CANCELLED, 'The request was cancelled')); return; } const timer = setTimeout(resolve, milliseconds); signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new AppError(AppErrorKind.CANCELLED, 'The request was cancelled')); }, { once: true }); }); }
function connectAbort(source: AbortSignal | null | undefined, target: AbortController): () => void { if (!source) return () => undefined; const abort = () => target.abort(source.reason); if (source.aborted) abort(); else source.addEventListener('abort', abort, { once: true }); return () => source.removeEventListener('abort', abort); }
function appendQuery(path: string, query: RequestOptions['query']): string { if (!query) return path; const separator = path.includes('?') ? '&' : '?'; const search = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value !== null && value !== undefined) search.set(key, String(value)); const encoded = search.toString(); return encoded ? `${path}${separator}${encoded}` : path; }
