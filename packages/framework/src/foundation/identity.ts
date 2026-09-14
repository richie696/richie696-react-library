import type { StorageAdapter } from './storage.js';

/** Provides a stable random device identifier backed by an injected store. */
export class DeviceIdentity {
  /** Creates an identity provider using a storage adapter and optional key. */
  constructor(private readonly storage: StorageAdapter, private readonly key = 'richie696.device_id') {}
  /** Returns the stored identifier or creates it once. */
  async getOrCreate(): Promise<string> { const existing = await this.storage.get<string>(this.key); if (existing) return existing; const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; await this.storage.set(this.key, id); return id; }
}
