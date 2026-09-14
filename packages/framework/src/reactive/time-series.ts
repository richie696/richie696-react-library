import { StateStore, type ReadonlyStore } from './state-store.js';

export interface TimeSeriesPoint<T> { readonly at: number; readonly value: T; }

export class TimeSeriesStore<T> implements ReadonlyStore<readonly TimeSeriesPoint<T>[]> {
  private readonly state: StateStore<readonly TimeSeriesPoint<T>[]>;
  private readonly maxPoints: number;

  constructor(maxPoints = 300) {
    if (!Number.isInteger(maxPoints) || maxPoints <= 0) throw new RangeError('maxPoints must be a positive integer');
    this.maxPoints = maxPoints;
    this.state = new StateStore<readonly TimeSeriesPoint<T>[]>(Object.freeze([]));
  }

  getSnapshot = (): readonly TimeSeriesPoint<T>[] => this.state.getSnapshot();
  subscribe = (listener: () => void): (() => void) => this.state.subscribe(listener);

  append(value: T, at = Date.now()): void { this.appendPoint({ value, at }); }
  appendPoint(point: TimeSeriesPoint<T>): void { this.state.set(Object.freeze([...this.getSnapshot(), point].slice(-this.maxPoints))); }
  appendMany(points: readonly TimeSeriesPoint<T>[]): void { this.state.set(Object.freeze([...this.getSnapshot(), ...points].slice(-this.maxPoints))); }
  clearBefore(timestamp: number): void { this.state.set(Object.freeze(this.getSnapshot().filter((point) => point.at >= timestamp))); }
  clear(): void { this.state.set(Object.freeze([])); }
}
