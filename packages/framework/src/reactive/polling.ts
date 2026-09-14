import { catchError, defer, EMPTY, exhaustMap, retry, timer, timeout, type Subscription } from 'rxjs';
import { AppError } from '../foundation/errors.js';
import { ResourceStatus, type ResourceSnapshot } from './resource.js';
import { StateStore, type ReadonlyStore } from './state-store.js';

export interface PollingOptions {
  readonly intervalMs: number;
  readonly immediate?: boolean;
  readonly timeoutMs?: number;
  readonly retryCount?: number;
  readonly retryDelayMs?: number;
  readonly maxRetryDelayMs?: number;
}

export type PollingLoader<T> = (signal: AbortSignal) => PromiseLike<T>;

export class PollingStore<T> implements ReadonlyStore<ResourceSnapshot<T>> {
  private readonly state = new StateStore<ResourceSnapshot<T>>({ status: ResourceStatus.IDLE });
  private subscription?: Subscription;
  private controller?: AbortController;

  getSnapshot = (): ResourceSnapshot<T> => this.state.getSnapshot();
  subscribe = (listener: () => void): (() => void) => this.state.subscribe(listener);

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

  stop(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  reset(): void { this.stop(); this.state.set({ status: ResourceStatus.IDLE }); }
  complete(): void { this.stop(); this.state.complete(); }
}

function validatePollingOptions(options: PollingOptions): void {
  if (!Number.isFinite(options.intervalMs) || options.intervalMs <= 0) throw new RangeError('Polling intervalMs must be a finite positive number');
  if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new RangeError('Polling timeoutMs must be a finite positive number');
  if (options.retryCount !== undefined && (!Number.isInteger(options.retryCount) || options.retryCount < 0)) throw new RangeError('Polling retryCount must be a non-negative integer');
  if (options.retryDelayMs !== undefined && (!Number.isFinite(options.retryDelayMs) || options.retryDelayMs < 0)) throw new RangeError('Polling retryDelayMs must be a finite non-negative number');
  if (options.maxRetryDelayMs !== undefined && (!Number.isFinite(options.maxRetryDelayMs) || options.maxRetryDelayMs < 0)) throw new RangeError('Polling maxRetryDelayMs must be a finite non-negative number');
}
