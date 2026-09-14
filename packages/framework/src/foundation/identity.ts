import type { StorageAdapter } from './storage.js';
export class DeviceIdentity {
  constructor(private readonly storage: StorageAdapter, private readonly key = 'richie696.device_id') {}
  async getOrCreate(): Promise<string> { const existing = await this.storage.get<string>(this.key); if (existing) return existing; const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; await this.storage.set(this.key, id); return id; }
}
