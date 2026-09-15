import { Condition, type ConditionBinding } from './condition.js';
import { LockError, LockErrorCode, throwIfLockAborted } from './errors.js';
import { createLockOwner, type LockOwner } from './owner.js';
import { enqueueWaiter, type Waiter } from './waiter.js';

interface ReentrantRequest { readonly owner: LockOwner; }

/** A fair, reentrant lock for cooperating asynchronous tasks in one JavaScript runtime. */
export class ReentrantLock {
  private currentOwner?: LockOwner;
  private holds = 0;
  private readonly queue: Waiter<ReentrantRequest>[] = [];

  /** Acquires the lock for an explicit logical-task owner. */
  async lock(owner: LockOwner, signal?: AbortSignal): Promise<void> {
    throwIfLockAborted(signal);
    if (this.currentOwner === owner) {
      this.holds += 1;
      return;
    }
    if (this.currentOwner === undefined && this.queue.length === 0) {
      this.currentOwner = owner;
      this.holds = 1;
      return;
    }
    await enqueueWaiter(this.queue, { owner }, signal, () => this.drain());
  }

  /** Releases one hold. Only the current owner may unlock. */
  unlock(owner: LockOwner): void {
    this.assertOwner(owner);
    this.holds -= 1;
    if (this.holds === 0) {
      this.currentOwner = undefined;
      this.drain();
    }
  }

  /** Runs one callback under a fresh owner token. */
  async runExclusive<T>(task: () => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    const owner = createLockOwner('reentrant-lock-scope');
    return this.runExclusiveWith(owner, task, signal);
  }

  /** Runs one callback under a caller-supplied token, enabling explicit nested reentry. */
  async runExclusiveWith<T>(owner: LockOwner, task: () => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    await this.lock(owner, signal);
    try {
      return await task();
    } finally {
      this.unlock(owner);
    }
  }

  /** Creates a condition bound to this lock. */
  newCondition(): Condition<LockOwner> {
    const binding: ConditionBinding<LockOwner> = {
      assertOwner: (owner) => this.assertOwner(owner),
      release: (owner) => this.releaseCompletely(owner),
      reacquire: (owner, holdCount) => this.reacquire(owner, holdCount),
    };
    return new Condition(binding);
  }

  get isLocked(): boolean { return this.currentOwner !== undefined; }
  get holdCount(): number { return this.holds; }
  isHeldBy(owner: LockOwner): boolean { return this.currentOwner === owner; }

  private assertOwner(owner: LockOwner): void {
    if (this.currentOwner !== owner) throw new LockError(LockErrorCode.NotOwner, 'The caller does not own this lock');
  }

  private releaseCompletely(owner: LockOwner): number {
    this.assertOwner(owner);
    const holdCount = this.holds;
    this.currentOwner = undefined;
    this.holds = 0;
    this.drain();
    return holdCount;
  }

  private async reacquire(owner: LockOwner, holdCount: number): Promise<void> {
    await this.lock(owner);
    for (let index = 1; index < holdCount; index += 1) await this.lock(owner);
  }

  private drain(): void {
    if (this.currentOwner !== undefined) return;
    let next = this.queue.shift();
    while (next && !next.active) next = this.queue.shift();
    if (!next) return;
    this.currentOwner = next.request.owner;
    this.holds = 1;
    next.grant();
  }
}
