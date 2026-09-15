/** Explicit ownership token used to distinguish independently executing async tasks. */
export type LockOwner = symbol;

/** Creates a lock ownership token for one logical async task. */
export function createLockOwner(description = 'async-lock-owner'): LockOwner {
  return Symbol(description);
}
