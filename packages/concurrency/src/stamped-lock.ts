import type { Condition } from './condition.js';
import { createLockOwner, type LockOwner } from './owner.js';
import { ReadWriteLock } from './read-write-lock.js';

/** Read/write coordination with optimistic version stamps for one JavaScript runtime. */
export class StampedLock {
  private readonly delegate = new ReadWriteLock();
  private version = 1;

  /** Acquires a shared read lock and returns the current version stamp. */
  async readLock(owner: LockOwner, signal?: AbortSignal): Promise<number> {
    await this.delegate.readLock(owner, signal);
    return this.version;
  }

  readUnlock(owner: LockOwner): void { this.delegate.readUnlock(owner); }

  /** Acquires the exclusive write lock and advances the version on first entry. */
  async writeLock(owner: LockOwner, signal?: AbortSignal): Promise<number> {
    const reentrant = this.delegate.isWriteLockedBy(owner);
    await this.delegate.writeLock(owner, signal);
    if (!reentrant) this.version += 1;
    return this.version;
  }

  writeUnlock(owner: LockOwner): void { this.delegate.writeUnlock(owner); }

  /** Returns zero while a writer is active; otherwise returns a validateable version. */
  tryOptimisticRead(): number { return this.delegate.isWriteLocked ? 0 : this.version; }

  /** Checks that no write acquisition invalidated an optimistic read. */
  validate(stamp: number): boolean {
    return stamp !== 0 && !this.delegate.isWriteLocked && stamp === this.version;
  }

  async runRead<T>(task: (stamp: number) => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    const owner = createLockOwner('stamped-read-scope');
    const stamp = await this.readLock(owner, signal);
    try { return await task(stamp); } finally { this.readUnlock(owner); }
  }

  async runWrite<T>(task: (stamp: number) => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    const owner = createLockOwner('stamped-write-scope');
    const stamp = await this.writeLock(owner, signal);
    try { return await task(stamp); } finally { this.writeUnlock(owner); }
  }

  /** Creates a write-lock condition. */
  newCondition(): Condition<LockOwner> { return this.delegate.newCondition(); }
}
