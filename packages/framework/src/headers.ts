import type { StorageAdapter } from './storage.js';

export interface ManagedHeadersOptions {
  readonly storageKey?: string;
  readonly persist?: boolean;
  readonly ttlMs?: number;
  readonly allowlist?: readonly string[];
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

export class ManagedHeadersStore {
  private readonly headers = new Headers();
  private readonly storage?: StorageAdapter;
  private readonly storageKey: string;
  private readonly persist: boolean;
  private readonly ttlMs: number;
  private readonly allowlist: ReadonlySet<string>;

  constructor(options: ManagedHeadersOptions = {}) {
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.persist = options.persist ?? true;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.allowlist = new Set((options.allowlist ?? DEFAULT_ALLOWLIST).map((name) => name.toLowerCase()).filter((name) => !BLOCKED_HEADERS.has(name)));
  }

  async load(): Promise<void> {
    if (!this.persist || !this.storage) return;
    const persisted = await this.storage.get<PersistedHeaders>(this.storageKey);
    if (!persisted || !Number.isFinite(persisted.savedAt) || Date.now() - persisted.savedAt > this.ttlMs) {
      if (persisted) await this.storage.remove(this.storageKey);
      return;
    }
    for (const [name, value] of Object.entries(persisted.values)) this.headers.set(name, value);
  }

  set(name: string, value: string): void {
    const normalized = name.toLowerCase();
    if (!this.allowlist.has(normalized)) return;
    this.headers.set(normalized, value);
    void this.save().catch(() => undefined);
  }

  get(name: string): string | null { return this.headers.get(name); }

  capture(headers: Headers): void {
    headers.forEach((value, name) => {
      if (this.allowlist.has(name.toLowerCase())) this.set(name, value);
    });
  }

  delete(name: string): void {
    this.headers.delete(name);
    void this.save().catch(() => undefined);
  }

  clear(): void {
    this.headers.forEach((_, name) => this.headers.delete(name));
    if (this.storage) void this.storage.remove(this.storageKey).catch(() => undefined);
  }

  snapshot(): Headers { return new Headers(this.headers); }

  private async save(): Promise<void> {
    if (!this.persist || !this.storage) return;
    const values: Record<string, string> = {};
    this.headers.forEach((value, name) => { values[name] = value; });
    await this.storage.set<PersistedHeaders>(this.storageKey, { values, savedAt: Date.now() });
  }
}
