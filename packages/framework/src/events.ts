import { Observable, Subject, type Subscription } from 'rxjs';

/**
 * Public, framework-neutral event facade. RxJS remains an implementation detail;
 * consumers only depend on typed publish/subscribe semantics and an unsubscribe function.
 */
export type EventHandler<T> = (event: T) => void;

export interface EventStream<Events extends object> {
  on<K extends keyof Events>(name: K, handler: EventHandler<Events[K]>): () => void;
  emit<K extends keyof Events>(name: K, event: Events[K]): void;
  clear(): void;
}

export class EventBus<Events extends object> implements EventStream<Events> {
  private readonly subjects = new Map<keyof Events, Subject<unknown>>();
  private readonly subscriptions = new Set<Subscription>();

  on<K extends keyof Events>(name: K, handler: EventHandler<Events[K]>): () => void {
    const subject = this.subjectFor(name);
    const subscription = subject.subscribe({
      next: (event) => {
        try {
          handler(event as Events[K]);
        } catch (error) {
          console.warn(`[EventBus] observer failed for ${String(name)}`, error);
        }
      },
    });
    this.subscriptions.add(subscription);
    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscription);
    };
  }

  emit<K extends keyof Events>(name: K, event: Events[K]): void { this.subjectFor(name).next(event); }

  clear(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    for (const subject of this.subjects.values()) subject.complete();
    this.subscriptions.clear();
    this.subjects.clear();
  }

  /** Internal escape hatch for framework adapters; RxJS is not part of the contract. */
  observe<K extends keyof Events>(name: K): Observable<Events[K]> { return this.subjectFor(name).asObservable() as Observable<Events[K]>; }

  private subjectFor<K extends keyof Events>(name: K): Subject<unknown> {
    const existing = this.subjects.get(name);
    if (existing) return existing;
    const subject = new Subject<unknown>();
    this.subjects.set(name, subject);
    return subject;
  }
}
