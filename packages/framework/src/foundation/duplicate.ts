import { sha256Hex } from './crypto.js';

/** Prevents repeated submissions of the same request within a time window. */
export class DuplicateRequestGuard {
  private readonly requests = new Map<string, number>();

  /** Creates a guard with the supplied suppression window. */
  constructor(private timeWindowMs = 3_000) {}

  /** Creates a stable request fingerprint for the current time window. */
  async key(url: string, method: string, body: unknown, userId: string | null): Promise<string> {
    const window = Math.floor(Date.now() / this.timeWindowMs) * this.timeWindowMs;
    return sha256Hex(JSON.stringify({ url, method, body: stableSerialize(body), userId: userId ?? '', window }));
  }

  /** Returns true when a fingerprint has been recorded recently. */
  isDuplicate(requestId: string): boolean {
    const timestamp = this.requests.get(requestId);
    return timestamp !== undefined && Date.now() - timestamp < this.timeWindowMs;
  }

  /** Records a fingerprint and removes expired entries. */
  record(requestId: string): void {
    this.requests.set(requestId, Date.now());
    this.cleanup();
  }

  /** Removes one recorded fingerprint. */
  clear(requestId: string): void { this.requests.delete(requestId); }
  /** Removes all recorded fingerprints. */
  clearAll(): void { this.requests.clear(); }
  /** Changes the deduplication window for future checks. */
  updateTimeWindow(timeWindowMs: number): void { this.timeWindowMs = timeWindowMs; }

  private cleanup(): void {
    const cutoff = Date.now() - this.timeWindowMs;
    for (const [requestId, timestamp] of this.requests) if (timestamp < cutoff) this.requests.delete(requestId);
  }
}

function stableSerialize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new TypeError('Cannot serialize circular request body');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => stableSerialize(item, seen));
    if (value instanceof Date) return value.toISOString();
    if (typeof FormData !== 'undefined' && value instanceof FormData) return '[FormData]';
    return Object.fromEntries(Object.keys(value as object).sort().map((key) => [key, stableSerialize((value as Record<string, unknown>)[key], seen)]));
  } finally { seen.delete(value); }
}
