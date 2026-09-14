import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

export interface ReadonlyStore<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}

export type Equality<T> = (left: T, right: T) => boolean;

export class StateStore<T> implements ReadonlyStore<T> {
  private readonly subject: BehaviorSubject<T>;
  private readonly equality: Equality<T>;
  private snapshot: T;

  constructor(initial: T, equality: Equality<T> = Object.is) {
    this.snapshot = initial;
    this.equality = equality;
    this.subject = new BehaviorSubject(initial);
  }

  getSnapshot = (): T => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    const subscription = this.subject.pipe(distinctUntilChanged(this.equality)).subscribe(() => listener());
    return () => subscription.unsubscribe();
  };

  set(next: T): void {
    if (this.equality(this.snapshot, next)) return;
    this.snapshot = next;
    this.subject.next(next);
  }

  update(updater: (current: T) => T): void { this.set(updater(this.snapshot)); }

  complete(): void { this.subject.complete(); }
}
