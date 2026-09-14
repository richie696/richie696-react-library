import { HttpMethod, type RequestOptions } from './types.js';

/** Immutable behavior flags for an endpoint descriptor. */
export interface UrlOptions {
  /** HTTP method used when no per-request override is supplied. */
  readonly method?: HttpMethod;
  /** Enables the ECDH/AES-GCM request protection path. */
  readonly needEncryption?: boolean;
  /** Enables duplicate submission protection for this endpoint. */
  readonly needDuplicateCheck?: boolean;
}
/** Read-only collection of named endpoint descriptors. */
export type UrlCatalog = Readonly<Record<string, Url>>;

/** Immutable endpoint descriptor that resolves path and query parameters. */
export class Url {
  /** Endpoint path template. */
  readonly path: string;
  /** Default HTTP method. */
  readonly method: HttpMethod;
  /** Whether request encryption is enabled. */
  readonly needEncryption: boolean;
  /** Whether duplicate submission protection is enabled. */
  readonly needDuplicateCheck: boolean;
  /** Creates an endpoint descriptor and validates that its path is absolute. */
  constructor(path: string, options: UrlOptions = {}) {
    if (!path.startsWith('/')) throw new TypeError('URL path must start with /');
    this.path = path; this.method = options.method ?? HttpMethod.GET;
    this.needEncryption = options.needEncryption ?? false; this.needDuplicateCheck = options.needDuplicateCheck ?? false;
  }
  /** Resolves positional path parameters and optional query values. */
  resolve(params: readonly (string | number)[] = [], options: RequestOptions = {}): string {
    let cursor = 0;
    const resolvedPath = this.path.replace(/\{[^}]+\}/g, () => {
      const value = params[cursor++];
      if (value === undefined) throw new TypeError(`Missing URL parameter at index ${cursor - 1}`);
      return encodeURIComponent(String(value));
    });
    if (!options.query) return resolvedPath;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query)) if (value !== null && value !== undefined) search.set(key, String(value));
    const encoded = search.toString(); return encoded ? `${resolvedPath}?${encoded}` : resolvedPath;
  }
}

/** Defines one endpoint constant without a mutable global URL registry. */
export function defineUrl(path: string, options: UrlOptions = {}): Url { return new Url(path, options); }

/** Freezes an endpoint catalog so request metadata cannot be changed at runtime. */
export function defineUrlCatalog<const T extends UrlCatalog>(catalog: T): Readonly<T> { return Object.freeze({ ...catalog }); }
