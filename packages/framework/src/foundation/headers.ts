import type { StorageAdapter } from './storage.js';

/** Configuration for safe caching of explicitly allowed response headers. */
export interface ManagedHeadersOptions {
  /** Storage key for the persisted header snapshot. */
  readonly storageKey?: string;
  /** Enables persistence through the supplied storage adapter. */
  readonly persist?: boolean;
  /** Header snapshot lifetime in milliseconds. */
  readonly ttlMs?: number;
  /** Header names eligible for capture and replay. */
  readonly allowlist?: readonly string[];
  /** Optional persistence adapter. */
  readonly storage?: StorageAdapter;
}

interface PersistedHeaders {
  readonly values: Readonly<Record<string, string>>;
  readonly savedAt: number;
}

const DEFAULT_STORAGE_KEY = 'http_headers';
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_ALLOWLIST = ['x-rd-request-apitoken'];
const BLOCKED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'proxy-authorization']);

/** Stores allowlisted response headers with optional persistence and expiration. */
export class ManagedHeadersStore {
  private readonly headers = new Headers();
  private readonly storage?: StorageAdapter;
  private readonly storageKey: string;
  private readonly persist: boolean;
  private readonly ttlMs: number;
  private readonly allowlist: ReadonlySet<string>;

  /** Creates a managed-header store with optional persistence and allowlisting. */
  constructor(options: ManagedHeadersOptions = {}) {
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.persist = options.persist ?? true;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.allowlist = new Set((options.allowlist ?? DEFAULT_ALLOWLIST).map((name) => name.toLowerCase()).filter((name) => !BLOCKED_HEADERS.has(name)));
  }

  /** Loads a non-expired persisted snapshot, if configured. */
  async load(): Promise<void> {
    if (!this.persist || !this.storage) return;
    const persisted = await this.storage.get<PersistedHeaders>(this.storageKey);
    if (!persisted || !Number.isFinite(persisted.savedAt) || Date.now() - persisted.savedAt > this.ttlMs) {
      if (persisted) await this.storage.remove(this.storageKey);
      return;
    }
    for (const [name, value] of Object.entries(persisted.values)) this.headers.set(name, value);
  }

  /** Stores a header when its normalized name is allowlisted. */
  set(name: string, value: string): void {
    const normalized = name.toLowerCase();
    if (!this.allowlist.has(normalized)) return;
    this.headers.set(normalized, value);
    void this.save().catch(() => undefined);
  }

  /** Reads a managed header or returns null when it is absent. */
  get(name: string): string | null { return this.headers.get(name); }

  /** Captures allowlisted values from a response header collection. */
  capture(headers: Headers): void {
    headers.forEach((value, name) => {
      if (this.allowlist.has(name.toLowerCase())) this.set(name, value);
    });
  }

  /** Removes one managed header. */
  delete(name: string): void {
    this.headers.delete(name);
    void this.save().catch(() => undefined);
  }

  /** Removes all managed headers and their persisted snapshot. */
  clear(): void {
    this.headers.forEach((_, name) => this.headers.delete(name));
    if (this.storage) void this.storage.remove(this.storageKey).catch(() => undefined);
  }

  /** Returns a defensive copy of the current managed headers. */
  snapshot(): Headers { return new Headers(this.headers); }

  private async save(): Promise<void> {
    if (!this.persist || !this.storage) return;
    const values: Record<string, string> = {};
    this.headers.forEach((value, name) => { values[name] = value; });
    await this.storage.set<PersistedHeaders>(this.storageKey, { values, savedAt: Date.now() });
  }
}
