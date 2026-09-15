# @richie696/react-framework-browser-fingerprint

[![npm version](https://img.shields.io/npm/v/@richie696%2Freact-framework-browser-fingerprint?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/react-framework-browser-fingerprint)
[![npm downloads](https://img.shields.io/npm/dm/@richie696%2Freact-framework-browser-fingerprint?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/react-framework-browser-fingerprint)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-react-library?logo=github&label=stars)](https://github.com/richie696/richie696-react-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-react-library?logo=github&label=issues)](https://github.com/richie696/richie696-react-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-react-library?logo=opensourceinitiative&label=license)](../../LICENSE)

[📚 Monorepo 文档](../../README.md) · [📦 包结构](../../README.md#包结构) · [💻 GitHub](https://github.com/richie696/richie696-react-library) · [🐛 Issues](https://github.com/richie696/richie696-react-library/issues) · [🤝 贡献](../../CONTRIBUTING.md) · [🛡️ 安全](../../SECURITY.md) · [📄 License](../../LICENSE)


Opt-in collection, hashing and signing of coarse browser/device signals.

## Installation

```bash
pnpm add @richie696/react-framework-browser-fingerprint
```

## Public capabilities

- `BrowserHardwareFingerprintCollector` and `generateHardwareFingerprint` for Canvas, WebGL and coarse browser signals.
- `fingerprintToString`, `fingerprintFromString`, `fingerprintToHash` and weighted similarity comparison.
- `createHmacHardwareFingerprintProvider` for timestamped, nonce-bearing signed header values.
- Injectable browser environment and explicit `FingerprintUnavailableError` for SSR/non-browser hosts.

## Example

```ts
import { createHmacHardwareFingerprintProvider } from '@richie696/react-framework-browser-fingerprint';

const provider = createHmacHardwareFingerprintProvider('server-agreed-secret');
const headerValue = await provider.getHeaderValue();
```

Collection is never automatic. Signals can change with browser settings, privacy protections, upgrades or device conditions; they are not a stable hardware identity. A browser-delivered HMAC secret is not confidential.

See the repository [LICENSE](../../LICENSE) and [security policy](../../SECURITY.md).
