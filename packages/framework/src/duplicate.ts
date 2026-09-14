import { sha256Hex } from './crypto.js';

export class DuplicateRequestGuard {
  private readonly requests = new Map<string, number>();

  constructor(private timeWindowMs = 3_000) {}

  async key(url: string, method: string, body: unknown, userId: string | null): Promise<string> {
    const window = Math.floor(Date.now() / this.timeWindowMs) * this.timeWindowMs;
    return sha256Hex(JSON.stringify({ url, method, body: stableSerialize(body), userId: userId ?? '', window }));
  }

  isDuplicate(requestId: string): boolean {
    const timestamp = this.requests.get(requestId);
    return timestamp !== undefined && Date.now() - timestamp < this.timeWindowMs;
  }

  record(requestId: string): void {
    this.requests.set(requestId, Date.now());
    this.cleanup();
  }

  clear(requestId: string): void { this.requests.delete(requestId); }
  clearAll(): void { this.requests.clear(); }
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
