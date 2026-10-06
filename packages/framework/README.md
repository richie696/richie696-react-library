# @richie696/react-framework

[![npm version](https://img.shields.io/npm/v/@richie696%2Freact-framework?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/react-framework)
[![npm downloads](https://img.shields.io/npm/dm/@richie696%2Freact-framework?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/react-framework)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-react-library?logo=github&label=stars)](https://github.com/richie696/richie696-react-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-react-library?logo=github&label=issues)](https://github.com/richie696/richie696-react-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-react-library?logo=opensourceinitiative&label=license)](../../LICENSE)

[📚 Monorepo 文档](../../README.md) · [📦 包结构](../../README.md#包结构) · [💻 GitHub](https://github.com/richie696/richie696-react-library) · [🐛 Issues](https://github.com/richie696/richie696-react-library/issues) · [🤝 贡献](../../CONTRIBUTING.md) · [🛡️ 安全](../../SECURITY.md) · [📄 License](../../LICENSE)


Framework-neutral foundation for HTTP transport, URL models, errors, storage, identity, events and reactive state.

## Installation

```bash
pnpm add @richie696/react-framework
```

## Public capabilities

- `HttpClient` / `GatewayClient`: Fetch-based requests, query/path parameters, retries, timeout, cancellation, request/response interceptors and API envelope handling.
- Optional SSE parsing through `requestStream`.
- `Url`, `HttpMethod`, `ApiResult`, `AppError` and typed request contracts.
- `BrowserStorage`, `MemoryStorage`, `DeviceIdentity` and managed response headers.
- `EventBus`, `StateStore`, `ObservableResource`, `PollingStore` and `TimeSeriesStore`.
- Compatibility re-exports for crypto helpers; new code should install the focused security package directly.

## Internationalization deprecation

`Translator` and its `TranslationValues` type are deprecated and will be removed in **1.0.3**. They remain exported with unchanged behavior until removal; new applications should use **[i18next](https://www.i18next.com/) + [react-i18next](https://react.i18next.com/)** directly.

```bash
pnpm add i18next react-i18next
```

Initialize the application-owned i18next instance and register feature translation resources in `app/i18n`. React components use `useTranslation` from `react-i18next`; non-React code uses the same i18next instance. This framework does not configure or wrap these libraries. See the [official React setup guide](https://react.i18next.com/latest/using-with-hooks).

When migrating, update the legacy `{name}` placeholders to i18next's default `{{name}}` syntax and verify locale fallback behavior. `I18nDictionary` and the `ApiResult.i18n` response field remain part of the protocol contract and are not included in this removal.

## Example

```ts
import { HttpClient, HttpMethod, defineUrl } from '@richie696/react-framework';

const client = new HttpClient({ baseUrl: 'https://api.example.com' });
const profileUrl = defineUrl('/users/{id}', { method: HttpMethod.GET });
const profile = await client.requestData<{ id: string }>(profileUrl, ['42']);
```

## Runtime boundary

The package uses standard `fetch`, `AbortController`, Web Crypto and storage APIs. It is usable without React. Browser-specific capabilities require a browser host or an injected adapter; SSR callers should provide compatible adapters where needed.

## Related packages

- [Concurrency](../concurrency/README.md)
- [Security](../security/README.md)
- [Browser fingerprint](../browser-fingerprint/README.md)
- [React bindings](../react/README.md)

See the repository [LICENSE](../../LICENSE) and [security policy](../../SECURITY.md).
