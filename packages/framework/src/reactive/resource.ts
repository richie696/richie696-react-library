import { catchError, defer, EMPTY, from, take, timeout, type ObservableInput, type Subscription } from 'rxjs';
import { AppError, AppErrorKind } from '../foundation/errors.js';
import { StateStore, type ReadonlyStore } from './state-store.js';

/** Stable lifecycle values for asynchronous resources. */
export const ResourceStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
/** Union of values exposed by {@link ResourceStatus}. */
export type ResourceStatus = typeof ResourceStatus[keyof typeof ResourceStatus];

/** Immutable snapshot exposed by a resource store. */
export interface ResourceSnapshot<T> {
  /** Current resource lifecycle status. */
  readonly status: ResourceStatus;
  /** Last successful value, when one exists. */
  readonly data?: T;
  /** Normalized error for the latest failed load. */
  readonly error?: AppError;
  /** Timestamp of the latest successful value. */
  readonly updatedAt?: number;
}

/** Loads one value or the first value from an async iterable. */
export type ResourceLoader<T> = (signal: AbortSignal) => PromiseLike<T> | AsyncIterable<T>;

/** Cancellable resource store with stale-result protection. */
export class ObservableResource<T> implements ReadonlyStore<ResourceSnapshot<T>> {
  private readonly state = new StateStore<ResourceSnapshot<T>>({ status: ResourceStatus.IDLE });
  private subscription?: Subscription;
  private controller?: AbortController;
  private generation = 0;
  private pendingReject?: (reason: AppError) => void;

  /** Returns the current resource snapshot. */
  getSnapshot = (): ResourceSnapshot<T> => this.state.getSnapshot();
  /** Subscribes to resource lifecycle changes. */
  subscribe = (listener: () => void): (() => void) => this.state.subscribe(listener);

  /** Starts a load and resolves with its first value. */
  load(loader: ResourceLoader<T>, options: { readonly timeoutMs?: number } = {}): Promise<T> {
    if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new RangeError('Resource timeoutMs must be a finite positive number');
    this.cancel();
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.state.set({ status: ResourceStatus.LOADING });
    const source = defer(() => from(loader(controller.signal) as ObservableInput<T>)).pipe(take(1));
    const bounded = options.timeoutMs === undefined ? source : source.pipe(timeout({ each: options.timeoutMs }));
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      this.pendingReject = reject;
      this.subscription = bounded.pipe(catchError((error: unknown) => {
        if (generation !== this.generation) return EMPTY;
        settled = true;
        const normalized = AppError.fromUnknown(error);
        this.pendingReject = undefined;
        this.state.set({ status: ResourceStatus.ERROR, error: normalized });
        reject(normalized);
        return EMPTY;
      })).subscribe({
        next: (value) => {
          if (generation !== this.generation) return;
          settled = true;
          this.pendingReject = undefined;
          this.state.set({ status: ResourceStatus.SUCCESS, data: value, updatedAt: Date.now() });
          resolve(value);
        },
        complete: () => {
          if (generation !== this.generation || settled) return;
          settled = true;
          const error = new AppError(AppErrorKind.PROTOCOL, 'The resource loader completed without a value');
          this.pendingReject = undefined;
          this.state.set({ status: ResourceStatus.ERROR, error });
          reject(error);
        },
      });
    });
  }

  /** Cancels the active load and rejects its pending promise as cancelled. */
  cancel(): void {
    this.generation += 1;
    this.pendingReject?.(new AppError(AppErrorKind.CANCELLED, 'The resource load was cancelled'));
    this.pendingReject = undefined;
    this.controller?.abort();
    this.controller = undefined;
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  /** Cancels the active load and returns the resource to idle. */
  reset(): void { this.cancel(); this.state.set({ status: ResourceStatus.IDLE }); }
  /** Cancels the active load and completes all subscribers. */
  complete(): void { this.cancel(); this.state.complete(); }
}
