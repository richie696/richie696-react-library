/** Shares one in-flight promise for each key and removes it after settlement. */
export class SingleFlight<K, V> {
  private readonly pending = new Map<K, Promise<V>>();

  /** Returns the existing in-flight result or starts the supplied task once. */
  run(key: K, task: () => Promise<V>): Promise<V> {
    const existing = this.pending.get(key);
    if (existing) return existing;
    const current = task().finally(() => this.pending.delete(key));
    this.pending.set(key, current);
    return current;
  }
}
