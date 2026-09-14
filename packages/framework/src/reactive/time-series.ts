import { StateStore, type ReadonlyStore } from './state-store.js';

/** One timestamped value in a bounded monitoring series. */
export interface TimeSeriesPoint<T> {
  /** Timestamp in milliseconds since Unix epoch. */
  readonly at: number;
  /** Metric value associated with the timestamp. */
  readonly value: T;
}

/** Maintains a bounded immutable time-series window for charts. */
export class TimeSeriesStore<T> implements ReadonlyStore<readonly TimeSeriesPoint<T>[]> {
  private readonly state: StateStore<readonly TimeSeriesPoint<T>[]>;
  private readonly maxPoints: number;

  /** Creates a series that retains at most `maxPoints` values. */
  constructor(maxPoints = 300) {
    if (!Number.isInteger(maxPoints) || maxPoints <= 0) throw new RangeError('maxPoints must be a positive integer');
    this.maxPoints = maxPoints;
    this.state = new StateStore<readonly TimeSeriesPoint<T>[]>(Object.freeze([]));
  }

  /** Returns the current immutable series snapshot. */
  getSnapshot = (): readonly TimeSeriesPoint<T>[] => this.state.getSnapshot();
  /** Subscribes to series updates. */
  subscribe = (listener: () => void): (() => void) => this.state.subscribe(listener);

  /** Appends a value using the supplied timestamp or the current time. */
  append(value: T, at = Date.now()): void { this.appendPoint({ value, at }); }
  /** Appends one point and trims the oldest values over the configured bound. */
  appendPoint(point: TimeSeriesPoint<T>): void { this.state.set(Object.freeze([...this.getSnapshot(), point].slice(-this.maxPoints))); }
  /** Appends many points and trims the oldest values over the configured bound. */
  appendMany(points: readonly TimeSeriesPoint<T>[]): void { this.state.set(Object.freeze([...this.getSnapshot(), ...points].slice(-this.maxPoints))); }
  /** Removes points older than the supplied inclusive timestamp. */
  clearBefore(timestamp: number): void { this.state.set(Object.freeze(this.getSnapshot().filter((point) => point.at >= timestamp))); }
  /** Removes all points from the series. */
  clear(): void { this.state.set(Object.freeze([])); }
}
