import { HttpMethod, type RequestOptions } from './types.js';

export interface UrlOptions { readonly method?: HttpMethod; readonly needEncryption?: boolean; readonly needDuplicateCheck?: boolean; }
export type UrlCatalog = Readonly<Record<string, Url>>;

export class Url {
  readonly path: string; readonly method: HttpMethod; readonly needEncryption: boolean; readonly needDuplicateCheck: boolean;
  constructor(path: string, options: UrlOptions = {}) {
    if (!path.startsWith('/')) throw new TypeError('URL path must start with /');
    this.path = path; this.method = options.method ?? HttpMethod.GET;
    this.needEncryption = options.needEncryption ?? false; this.needDuplicateCheck = options.needDuplicateCheck ?? false;
  }
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

/** Define endpoint constants without a mutable global URL registry or enum inheritance. */
export function defineUrl(path: string, options: UrlOptions = {}): Url { return new Url(path, options); }

/** Freeze an endpoint catalog so request metadata cannot be changed at runtime. */
export function defineUrlCatalog<const T extends UrlCatalog>(catalog: T): Readonly<T> { return Object.freeze({ ...catalog }); }
