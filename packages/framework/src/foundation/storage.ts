/** Minimal asynchronous key/value contract used by browser and SSR adapters. */
export interface StorageAdapter { get<T>(key: string): Promise<T | undefined>; set<T>(key: string, value: T): Promise<void>; remove(key: string): Promise<void>; clear(): Promise<void>; }
/** JSON-backed adapter for a browser Storage implementation. */
export class BrowserStorage implements StorageAdapter {
  /** Creates an adapter over localStorage or another Storage-compatible object. */
  constructor(private readonly storage: Storage = globalThis.localStorage) {}
  /** Reads and parses a stored value. */
  async get<T>(key: string): Promise<T | undefined> { const raw = this.storage.getItem(key); if (raw === null) return undefined; try { return JSON.parse(raw) as T; } catch { return undefined; } }
  /** Serializes and stores a value. */
  async set<T>(key: string, value: T): Promise<void> { this.storage.setItem(key, JSON.stringify(value)); }
  /** Removes one stored value. */
  async remove(key: string): Promise<void> { this.storage.removeItem(key); }
  /** Removes all values from the underlying browser storage. */
  async clear(): Promise<void> { this.storage.clear(); }
}
/** In-memory storage adapter for SSR, tests and non-browser hosts. */
export class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, unknown>();
  /** Reads a value from memory. */
  async get<T>(key: string): Promise<T | undefined> { return this.values.get(key) as T | undefined; }
  /** Stores a value in memory. */
  async set<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
  /** Removes one in-memory value. */
  async remove(key: string): Promise<void> { this.values.delete(key); }
  /** Clears all in-memory values. */
  async clear(): Promise<void> { this.values.clear(); }
}
