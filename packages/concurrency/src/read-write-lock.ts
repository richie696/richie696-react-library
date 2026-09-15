import { Condition, type ConditionBinding } from './condition.js';
import { LockError, LockErrorCode, throwIfLockAborted } from './errors.js';
import { createLockOwner, type LockOwner } from './owner.js';
import { enqueueWaiter, type Waiter } from './waiter.js';

type LockMode = 'read' | 'write';
interface ReadWriteRequest { readonly mode: LockMode; readonly owner: LockOwner; }

/** A fair async read/write lock with concurrent readers and an exclusive reentrant writer. */
export class ReadWriteLock {
  private readonly readers = new Map<LockOwner, number>();
  private writerOwner?: LockOwner;
  private writerHolds = 0;
  private readonly queue: Waiter<ReadWriteRequest>[] = [];

  /** Acquires a shared read lock. Existing readers may reenter. */
  async readLock(owner: LockOwner, signal?: AbortSignal): Promise<void> {
    throwIfLockAborted(signal);
    const existing = this.readers.get(owner);
    if (existing !== undefined) {
      this.readers.set(owner, existing + 1);
      return;
    }
    if (this.writerOwner === owner) throw new LockError(LockErrorCode.UpgradeUnsupported, 'A write owner cannot acquire a separate read hold');
    if (this.writerOwner === undefined && this.queue.length === 0) {
      this.readers.set(owner, 1);
      return;
    }
    await enqueueWaiter(this.queue, { mode: 'read', owner }, signal, () => this.drain());
  }

  /** Releases one shared read hold. */
  readUnlock(owner: LockOwner): void {
    const count = this.readers.get(owner);
    if (count === undefined) throw new LockError(LockErrorCode.NotOwner, 'The caller does not own a read lock');
    if (count === 1) this.readers.delete(owner);
    else this.readers.set(owner, count - 1);
    if (this.readers.size === 0) this.drain();
  }

  /** Acquires the exclusive write lock. A current writer may reenter. */
  async writeLock(owner: LockOwner, signal?: AbortSignal): Promise<void> {
    throwIfLockAborted(signal);
    if (this.writerOwner === owner) {
      this.writerHolds += 1;
      return;
    }
    if (this.readers.has(owner)) throw new LockError(LockErrorCode.UpgradeUnsupported, 'Read-to-write lock upgrade is unsupported');
    if (this.writerOwner === undefined && this.readers.size === 0 && this.queue.length === 0) {
      this.writerOwner = owner;
      this.writerHolds = 1;
      return;
    }
    await enqueueWaiter(this.queue, { mode: 'write', owner }, signal, () => this.drain());
  }

  /** Releases one exclusive write hold. */
  writeUnlock(owner: LockOwner): void {
    this.assertWriteOwner(owner);
    this.writerHolds -= 1;
    if (this.writerHolds === 0) {
      this.writerOwner = undefined;
      this.drain();
    }
  }

  async runRead<T>(task: () => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    const owner = createLockOwner('read-lock-scope');
    await this.readLock(owner, signal);
    try { return await task(); } finally { this.readUnlock(owner); }
  }

  async runWrite<T>(task: () => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    const owner = createLockOwner('write-lock-scope');
    await this.writeLock(owner, signal);
    try { return await task(); } finally { this.writeUnlock(owner); }
  }

  /** Creates a condition that must be awaited and signalled while holding the write lock. */
  newCondition(): Condition<LockOwner> {
    const binding: ConditionBinding<LockOwner> = {
      assertOwner: (owner) => this.assertWriteOwner(owner),
      release: (owner) => this.releaseWriteCompletely(owner),
      reacquire: (owner, holdCount) => this.reacquireWrite(owner, holdCount),
    };
    return new Condition(binding);
  }

  get activeReaderCount(): number {
    let count = 0;
    for (const holds of this.readers.values()) count += holds;
    return count;
  }

  get isWriteLocked(): boolean { return this.writerOwner !== undefined; }
  isWriteLockedBy(owner: LockOwner): boolean { return this.writerOwner === owner; }

  private assertWriteOwner(owner: LockOwner): void {
    if (this.writerOwner !== owner) throw new LockError(LockErrorCode.NotOwner, 'The caller does not own the write lock');
  }

  private releaseWriteCompletely(owner: LockOwner): number {
    this.assertWriteOwner(owner);
    const holdCount = this.writerHolds;
    this.writerOwner = undefined;
    this.writerHolds = 0;
    this.drain();
    return holdCount;
  }

  private async reacquireWrite(owner: LockOwner, holdCount: number): Promise<void> {
    await this.writeLock(owner);
    for (let index = 1; index < holdCount; index += 1) await this.writeLock(owner);
  }

  private drain(): void {
    if (this.writerOwner !== undefined) return;
    this.removeInactiveHead();
    if (this.queue.length === 0) return;
    if (this.readers.size > 0 && this.queue[0]?.request.mode === 'write') return;

    if (this.readers.size === 0 && this.queue[0]?.request.mode === 'write') {
      const writer = this.queue.shift();
      if (!writer) return;
      this.writerOwner = writer.request.owner;
      this.writerHolds = 1;
      writer.grant();
      return;
    }

    while (this.queue[0]?.request.mode === 'read') {
      const reader = this.queue.shift();
      if (!reader) break;
      if (!reader.active) continue;
      this.readers.set(reader.request.owner, 1);
      reader.grant();
    }
  }

  private removeInactiveHead(): void {
    while (this.queue[0] && !this.queue[0].active) this.queue.shift();
  }
}
