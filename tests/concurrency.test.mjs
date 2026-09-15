import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLockOwner,
  LockErrorCode,
  ReadWriteLock,
  ReentrantLock,
  StampedLock,
} from '../packages/concurrency/dist/index.js';

test('ReentrantLock isolates owners, preserves hold counts and drains fairly', async () => {
  const lock = new ReentrantLock();
  const first = createLockOwner('first');
  const second = createLockOwner('second');
  await lock.lock(first);
  await lock.lock(first);
  assert.equal(lock.holdCount, 2);

  let secondEntered = false;
  const waiting = lock.lock(second).then(() => { secondEntered = true; });
  await Promise.resolve();
  assert.equal(secondEntered, false);
  lock.unlock(first);
  await Promise.resolve();
  assert.equal(secondEntered, false);
  lock.unlock(first);
  await waiting;
  assert.equal(secondEntered, true);
  assert.equal(lock.isHeldBy(second), true);
  lock.unlock(second);
});

test('ReentrantLock removes an aborted waiter without blocking later owners', async () => {
  const lock = new ReentrantLock();
  const first = createLockOwner('first');
  const cancelled = createLockOwner('cancelled');
  const last = createLockOwner('last');
  await lock.lock(first);
  const controller = new AbortController();
  const waiting = lock.lock(cancelled, controller.signal);
  controller.abort('cancel test');
  await assert.rejects(waiting, (error) => error.code === LockErrorCode.Aborted);
  lock.unlock(first);
  await lock.lock(last);
  assert.equal(lock.isHeldBy(last), true);
  lock.unlock(last);
});

test('Condition releases all reentrant holds and restores them after signal', async () => {
  const lock = new ReentrantLock();
  const waiterOwner = createLockOwner('waiter');
  const signalOwner = createLockOwner('signal');
  const condition = lock.newCondition();
  await lock.lock(waiterOwner);
  await lock.lock(waiterOwner);

  const waiting = condition.wait(waiterOwner);
  await Promise.resolve();
  assert.equal(lock.isLocked, false);
  await lock.lock(signalOwner);
  condition.signal(signalOwner);
  lock.unlock(signalOwner);
  await waiting;
  assert.equal(lock.isHeldBy(waiterOwner), true);
  assert.equal(lock.holdCount, 2);
  lock.unlock(waiterOwner);
  lock.unlock(waiterOwner);
});

test('Condition restores lock ownership before reporting cancellation', async () => {
  const lock = new ReentrantLock();
  const owner = createLockOwner('cancelled-condition');
  const condition = lock.newCondition();
  const controller = new AbortController();
  await lock.lock(owner);
  const waiting = condition.wait(owner, controller.signal);
  await Promise.resolve();
  controller.abort('cancel condition');
  await assert.rejects(waiting, (error) => error.code === LockErrorCode.Aborted && lock.isHeldBy(owner));
  lock.unlock(owner);
});

test('ReadWriteLock permits readers together and does not starve a queued writer', async () => {
  const lock = new ReadWriteLock();
  const readerOne = createLockOwner('reader-one');
  const readerTwo = createLockOwner('reader-two');
  const writer = createLockOwner('writer');
  const lateReader = createLockOwner('late-reader');
  await lock.readLock(readerOne);
  await lock.readLock(readerTwo);
  assert.equal(lock.activeReaderCount, 2);

  let writerEntered = false;
  let lateReaderEntered = false;
  const pendingWriter = lock.writeLock(writer).then(() => { writerEntered = true; });
  const pendingReader = lock.readLock(lateReader).then(() => { lateReaderEntered = true; });
  lock.readUnlock(readerOne);
  lock.readUnlock(readerTwo);
  await pendingWriter;
  assert.equal(writerEntered, true);
  assert.equal(lateReaderEntered, false);
  lock.writeUnlock(writer);
  await pendingReader;
  assert.equal(lateReaderEntered, true);
  lock.readUnlock(lateReader);
});

test('ReadWriteLock rejects implicit read-to-write upgrades', async () => {
  const lock = new ReadWriteLock();
  const owner = createLockOwner('reader');
  await lock.readLock(owner);
  await assert.rejects(lock.writeLock(owner), (error) => error.code === LockErrorCode.UpgradeUnsupported);
  lock.readUnlock(owner);
});

test('StampedLock invalidates optimistic reads when a writer enters', async () => {
  const lock = new StampedLock();
  const optimistic = lock.tryOptimisticRead();
  assert.equal(lock.validate(optimistic), true);
  const writer = createLockOwner('writer');
  const writeStamp = await lock.writeLock(writer);
  assert.equal(lock.tryOptimisticRead(), 0);
  assert.equal(lock.validate(optimistic), false);
  lock.writeUnlock(writer);
  assert.equal(lock.validate(optimistic), false);
  assert.equal(lock.validate(writeStamp), true);
});
