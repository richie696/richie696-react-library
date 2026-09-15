/** Stable error codes emitted by the asynchronous lock primitives. */
export const LockErrorCode = {
  Aborted: 'LOCK_ABORTED',
  NotOwner: 'LOCK_NOT_OWNER',
  UpgradeUnsupported: 'LOCK_UPGRADE_UNSUPPORTED',
} as const;

/** A stable lock failure with a machine-readable code. */
export class LockError extends Error {
  override readonly name = 'LockError';

  constructor(
    readonly code: typeof LockErrorCode[keyof typeof LockErrorCode],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/** Rejects immediately when a lock wait has already been cancelled. */
export function throwIfLockAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new LockError(LockErrorCode.Aborted, 'Lock acquisition was aborted', { cause: signal.reason });
  }
}
