import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

/** Minimal external-store contract consumable by React or another renderer. */
export interface ReadonlyStore<T> {
  /** Returns the current immutable snapshot. */
  getSnapshot(): T;
  /** Subscribes to snapshot changes and returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/** Equality strategy used to suppress redundant state notifications. */
export type Equality<T> = (left: T, right: T) => boolean;

/** Synchronous immutable-snapshot store backed by an internal reactive subject. */
export class StateStore<T> implements ReadonlyStore<T> {
  private readonly subject: BehaviorSubject<T>;
  private readonly equality: Equality<T>;
  private snapshot: T;

  /** Creates a store with an initial snapshot and optional equality strategy. */
  constructor(initial: T, equality: Equality<T> = Object.is) {
    this.snapshot = initial;
    this.equality = equality;
    this.subject = new BehaviorSubject(initial);
  }

  /** Returns the current snapshot. */
  getSnapshot = (): T => this.snapshot;

  /** Subscribes to distinct snapshots and immediately emits the current one. */
  subscribe = (listener: () => void): (() => void) => {
    const subscription = this.subject.pipe(distinctUntilChanged(this.equality)).subscribe(() => listener());
    return () => subscription.unsubscribe();
  };

  /** Replaces the snapshot when it differs according to the equality strategy. */
  set(next: T): void {
    if (this.equality(this.snapshot, next)) return;
    this.snapshot = next;
    this.subject.next(next);
  }

  /** Computes and applies the next snapshot from the current value. */
  update(updater: (current: T) => T): void { this.set(updater(this.snapshot)); }

  /** Completes the underlying subject and releases subscribers. */
  complete(): void { this.subject.complete(); }
}
