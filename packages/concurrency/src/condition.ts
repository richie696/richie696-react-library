import { LockError, LockErrorCode, throwIfLockAborted } from './errors.js';

/** Internal bridge implemented by locks that support condition variables. */
export interface ConditionBinding<Owner> {
  assertOwner(owner: Owner): void;
  release(owner: Owner): number;
  reacquire(owner: Owner, holdCount: number): Promise<void>;
}

interface ConditionWaiter {
  signal(): void;
  cancel(error: unknown): void;
}

/** A condition variable associated with one exclusive lock. */
export class Condition<Owner> {
  private readonly waiters: ConditionWaiter[] = [];

  constructor(private readonly binding: ConditionBinding<Owner>) {}

  /** Releases the lock, waits for a signal, then reacquires the original hold count. */
  async wait(owner: Owner, signal?: AbortSignal): Promise<void> {
    throwIfLockAborted(signal);
    this.binding.assertOwner(owner);
    const holdCount = this.binding.release(owner);
    let failure: unknown;
    try {
      await this.waitForSignal(signal);
    } catch (error) {
      failure = error;
    }
    await this.binding.reacquire(owner, holdCount);
    if (failure !== undefined) throw failure;
  }

  /** Java-compatible alias for {@link wait}. */
  async await(owner: Owner, signal?: AbortSignal): Promise<void> {
    await this.wait(owner, signal);
  }

  /** Wakes the oldest waiter. The caller must own the associated exclusive lock. */
  signal(owner: Owner): void {
    this.binding.assertOwner(owner);
    this.waiters.shift()?.signal();
  }

  /** Wakes every waiter. The caller must own the associated exclusive lock. */
  signalAll(owner: Owner): void {
    this.binding.assertOwner(owner);
    while (this.waiters.length > 0) this.waiters.shift()?.signal();
  }

  private waitForSignal(signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let active = true;
      const cleanup = (): void => signal?.removeEventListener('abort', onAbort);
      const remove = (): void => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
      };
      const settle = (callback: () => void): void => {
        if (!active) return;
        active = false;
        cleanup();
        callback();
      };
      const waiter: ConditionWaiter = {
        signal: () => settle(resolve),
        cancel: (error) => settle(() => reject(error)),
      };
      const onAbort = (): void => {
        remove();
        waiter.cancel(new LockError(LockErrorCode.Aborted, 'Condition wait was aborted', { cause: signal?.reason }));
      };
      this.waiters.push(waiter);
      if (signal?.aborted) onAbort();
      else signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
