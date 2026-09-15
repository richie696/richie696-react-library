# @richie696/react-framework-react

[![npm version](https://img.shields.io/npm/v/@richie696%2Freact-framework-react?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/react-framework-react)
[![npm downloads](https://img.shields.io/npm/dm/@richie696%2Freact-framework-react?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/react-framework-react)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-react-library?logo=github&label=stars)](https://github.com/richie696/richie696-react-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-react-library?logo=github&label=issues)](https://github.com/richie696/richie696-react-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-react-library?logo=opensourceinitiative&label=license)](../../LICENSE)

[📚 Monorepo 文档](../../README.md) · [📦 包结构](../../README.md#包结构) · [💻 GitHub](https://github.com/richie696/richie696-react-library) · [🐛 Issues](https://github.com/richie696/richie696-react-library/issues) · [🤝 贡献](../../CONTRIBUTING.md) · [🛡️ 安全](../../SECURITY.md) · [📄 License](../../LICENSE)


React 19 bindings for the framework-neutral Richie696 foundation.

## Installation

```bash
pnpm add @richie696/react-framework @richie696/react-framework-react react react-dom
```

## Public capabilities

- `ReactFrameworkProvider` and `useReactFramework` for shared HTTP, storage and typed events.
- `useHttpClient` and `useRequest` for cancellable request state.
- `useExternalSnapshot` for `useSyncExternalStore` compatible stores.
- `useObservableResource`, `useEvent` and `useOnlineStatus`.

## Example

```tsx
import { ReactFrameworkProvider } from '@richie696/react-framework-react';

export function App() {
  return (
    <ReactFrameworkProvider options={{ baseUrl: '/api' }}>
      <Routes />
    </ReactFrameworkProvider>
  );
}
```

The provider owns and cleans up its framework services when unmounted. UI components, routing and application-specific API gateways remain outside this package.

See the repository [LICENSE](../../LICENSE), [contribution guide](../../CONTRIBUTING.md) and [security policy](../../SECURITY.md).
