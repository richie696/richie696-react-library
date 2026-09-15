/** Serializes asynchronous tasks while preserving each task's return value. */
export class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();

  /** Runs a task after all previously queued tasks have completed. */
  async runExclusive<T>(task: () => Promise<T> | T): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }
}
