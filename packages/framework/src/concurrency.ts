export class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();
  async runExclusive<T>(task: () => Promise<T> | T): Promise<T> { const previous = this.tail; let release!: () => void; this.tail = new Promise<void>((resolve) => { release = resolve; }); await previous; try { return await task(); } finally { release(); } }
}
export class SingleFlight<K, V> {
  private readonly pending = new Map<K, Promise<V>>();
  run(key: K, task: () => Promise<V>): Promise<V> { const existing = this.pending.get(key); if (existing) return existing; const current = task().finally(() => this.pending.delete(key)); this.pending.set(key, current); return current; }
}
