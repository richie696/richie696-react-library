import { Subject, type Subscription } from 'rxjs';

/**
 * Public, framework-neutral event facade. RxJS remains an implementation detail;
 * consumers only depend on typed publish/subscribe semantics and an unsubscribe function.
 */
/** Callback invoked for one typed event payload. */
export type EventHandler<T> = (event: T) => void;

/** Framework-neutral typed publish/subscribe contract. */
export interface EventStream<Events extends object> {
  /** Subscribes to one event name and returns an idempotent unsubscribe function. */
  on<K extends keyof Events>(name: K, handler: EventHandler<Events[K]>): () => void;
  /** Publishes one event to current subscribers. */
  emit<K extends keyof Events>(name: K, event: Events[K]): void;
  /** Removes every subscription and completes the stream. */
  clear(): void;
}

/** RxJS-backed event stream whose public API does not expose RxJS types. */
export class EventBus<Events extends object> implements EventStream<Events> {
  private readonly subjects = new Map<keyof Events, Subject<unknown>>();
  private readonly subscriptions = new Set<Subscription>();

  /** Subscribes to one event name and isolates handler failures. */
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

  /** Publishes one typed event synchronously to current subscribers. */
  emit<K extends keyof Events>(name: K, event: Events[K]): void { this.subjectFor(name).next(event); }

  /** Completes all subjects and removes all subscriptions. */
  clear(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    for (const subject of this.subjects.values()) subject.complete();
    this.subscriptions.clear();
    this.subjects.clear();
  }

  private subjectFor<K extends keyof Events>(name: K): Subject<unknown> {
    const existing = this.subjects.get(name);
    if (existing) return existing;
    const subject = new Subject<unknown>();
    this.subjects.set(name, subject);
    return subject;
  }
}
