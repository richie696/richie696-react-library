export interface StorageAdapter { get<T>(key: string): Promise<T | undefined>; set<T>(key: string, value: T): Promise<void>; remove(key: string): Promise<void>; clear(): Promise<void>; }
export class BrowserStorage implements StorageAdapter {
  constructor(private readonly storage: Storage = globalThis.localStorage) {}
  async get<T>(key: string): Promise<T | undefined> { const raw = this.storage.getItem(key); if (raw === null) return undefined; try { return JSON.parse(raw) as T; } catch { return undefined; } }
  async set<T>(key: string, value: T): Promise<void> { this.storage.setItem(key, JSON.stringify(value)); }
  async remove(key: string): Promise<void> { this.storage.removeItem(key); }
  async clear(): Promise<void> { this.storage.clear(); }
}
export class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> { return this.values.get(key) as T | undefined; }
  async set<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
  async remove(key: string): Promise<void> { this.values.delete(key); }
  async clear(): Promise<void> { this.values.clear(); }
}
