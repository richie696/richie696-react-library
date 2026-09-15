import { LockError, LockErrorCode, throwIfLockAborted } from './errors.js';

export interface Waiter<T> {
  readonly request: T;
  readonly active: boolean;
  grant(): void;
  cancel(error: unknown): void;
}

/** Adds one cancellable waiter and removes it safely when the signal aborts. */
export function enqueueWaiter<T>(
  queue: Waiter<T>[],
  request: T,
  signal: AbortSignal | undefined,
  onCancelled: () => void,
): Promise<void> {
  throwIfLockAborted(signal);
  return new Promise<void>((resolve, reject) => {
    let active = true;
    const cleanup = (): void => signal?.removeEventListener('abort', onAbort);
    const remove = (): void => {
      const index = queue.indexOf(waiter);
      if (index >= 0) queue.splice(index, 1);
    };
    const settle = (callback: () => void): void => {
      if (!active) return;
      active = false;
      cleanup();
      callback();
    };
    const waiter: Waiter<T> = {
      request,
      get active() { return active; },
      grant: () => settle(resolve),
      cancel: (error) => settle(() => reject(error)),
    };
    const onAbort = (): void => {
      remove();
      waiter.cancel(new LockError(LockErrorCode.Aborted, 'Lock acquisition was aborted', { cause: signal?.reason }));
      onCancelled();
    };
    queue.push(waiter);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
  });
}
