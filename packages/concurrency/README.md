# @richie696/react-framework-concurrency

[![npm version](https://img.shields.io/npm/v/@richie696%2Freact-framework-concurrency?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/react-framework-concurrency)
[![npm downloads](https://img.shields.io/npm/dm/@richie696%2Freact-framework-concurrency?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/react-framework-concurrency)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-react-library?logo=github&label=stars)](https://github.com/richie696/richie696-react-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-react-library?logo=github&label=issues)](https://github.com/richie696/richie696-react-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-react-library?logo=opensourceinitiative&label=license)](../../LICENSE)

[📚 Monorepo 文档](../../README.md) · [📦 包结构](../../README.md#包结构) · [💻 GitHub](https://github.com/richie696/richie696-react-library) · [🐛 Issues](https://github.com/richie696/richie696-react-library/issues) · [🤝 贡献](../../CONTRIBUTING.md) · [🛡️ 安全](../../SECURITY.md) · [📄 License](../../LICENSE)


Async concurrency primitives for cooperating tasks in one JavaScript runtime.

## Installation

```bash
pnpm add @richie696/react-framework-concurrency
```

## Public capabilities

- `AsyncMutex` and `SingleFlight` for serialization and shared in-flight work.
- `ReentrantLock` with explicit `LockOwner` tokens, fairness, cancellation and `Condition` support.
- `ReadWriteLock` for shared readers and an exclusive reentrant writer.
- `StampedLock` for optimistic-read validation.
- `Condition`, `LockError`, `LockErrorCode` and `createLockOwner`.

## Example

```ts
import { ReentrantLock, createLockOwner } from '@richie696/react-framework-concurrency';

const lock = new ReentrantLock();
const owner = createLockOwner('cache-update');

await lock.runExclusiveWith(owner, async () => {
  // One cooperating async task at a time.
});
```

Locks are not cross-tab, cross-worker or cross-process synchronization. Always release explicit lock holds, preferably through `runExclusive`, `runRead` or `runWrite`.

See the repository [LICENSE](../../LICENSE) and [security policy](../../SECURITY.md).
