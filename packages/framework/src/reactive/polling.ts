import { catchError, defer, EMPTY, exhaustMap, retry, timer, timeout, type Subscription } from 'rxjs';
import { AppError } from '../foundation/errors.js';
import { ResourceStatus, type ResourceSnapshot } from './resource.js';
import { StateStore, type ReadonlyStore } from './state-store.js';

/** Timing and retry policy for a polling store. */
export interface PollingOptions {
  /** Delay between the start of scheduled poll ticks. */
  readonly intervalMs: number;
  /** Starts the first poll immediately when true or omitted. */
  readonly immediate?: boolean;
  /** Maximum duration of one loader attempt. */
  readonly timeoutMs?: number;
  /** Number of retries after the initial failed attempt. */
  readonly retryCount?: number;
  /** Initial delay before a retry. */
  readonly retryDelayMs?: number;
  /** Upper bound for exponential retry delay. */
  readonly maxRetryDelayMs?: number;
}

/** Loads one polling value using the store-owned cancellation signal. */
export type PollingLoader<T> = (signal: AbortSignal) => PromiseLike<T>;

/** External store for periodic data refresh with no-overlap semantics. */
export class PollingStore<T> implements ReadonlyStore<ResourceSnapshot<T>> {
  private readonly state = new StateStore<ResourceSnapshot<T>>({ status: ResourceStatus.IDLE });
  private subscription?: Subscription;
  private controller?: AbortController;

  /** Returns the current polling resource snapshot. */
  getSnapshot = (): ResourceSnapshot<T> => this.state.getSnapshot();
  /** Subscribes to polling state changes. */
  subscribe = (listener: () => void): (() => void) => this.state.subscribe(listener);

  /** Starts polling, replacing any existing loop. */
  start(loader: PollingLoader<T>, options: PollingOptions): void {
    validatePollingOptions(options);
    this.stop();
    const controller = new AbortController();
    this.controller = controller;
    const firstDelay = options.immediate === false ? options.intervalMs : 0;
    this.subscription = timer(firstDelay, options.intervalMs).pipe(
      exhaustMap(() => {
        const current = this.state.getSnapshot();
        if (current.data === undefined) this.state.set({ status: ResourceStatus.LOADING });
        let request = defer(() => loader(controller.signal));
        if (options.timeoutMs !== undefined) request = request.pipe(timeout({ each: options.timeoutMs }));
        request = request.pipe(retry({ count: options.retryCount ?? 0, delay: (_error, retryIndex) => timer(Math.min(options.maxRetryDelayMs ?? 30_000, (options.retryDelayMs ?? 250) * (2 ** (retryIndex - 1)))) }));
        return request.pipe(
          catchError((error: unknown) => { this.state.set({ ...this.state.getSnapshot(), status: ResourceStatus.ERROR, error: AppError.fromUnknown(error) }); return EMPTY; }),
        );
      }),
    ).subscribe((data) => this.state.set({ status: ResourceStatus.SUCCESS, data, updatedAt: Date.now() }));
  }

  /** Stops the loop and aborts the current loader without resetting data. */
  stop(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  /** Stops polling and returns the snapshot to idle. */
  reset(): void { this.stop(); this.state.set({ status: ResourceStatus.IDLE }); }
  /** Stops polling and completes all subscribers. */
  complete(): void { this.stop(); this.state.complete(); }
}

function validatePollingOptions(options: PollingOptions): void {
  if (!Number.isFinite(options.intervalMs) || options.intervalMs <= 0) throw new RangeError('Polling intervalMs must be a finite positive number');
  if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new RangeError('Polling timeoutMs must be a finite positive number');
  if (options.retryCount !== undefined && (!Number.isInteger(options.retryCount) || options.retryCount < 0)) throw new RangeError('Polling retryCount must be a non-negative integer');
  if (options.retryDelayMs !== undefined && (!Number.isFinite(options.retryDelayMs) || options.retryDelayMs < 0)) throw new RangeError('Polling retryDelayMs must be a finite non-negative number');
  if (options.maxRetryDelayMs !== undefined && (!Number.isFinite(options.maxRetryDelayMs) || options.maxRetryDelayMs < 0)) throw new RangeError('Polling maxRetryDelayMs must be a finite non-negative number');
}
