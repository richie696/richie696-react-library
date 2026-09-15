# @richie696/react-framework-security

[![npm version](https://img.shields.io/npm/v/@richie696%2Freact-framework-security?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/react-framework-security)
[![npm downloads](https://img.shields.io/npm/dm/@richie696%2Freact-framework-security?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/react-framework-security)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-react-library?logo=github&label=stars)](https://github.com/richie696/richie696-react-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-react-library?logo=github&label=issues)](https://github.com/richie696/richie696-react-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-react-library?logo=opensourceinitiative&label=license)](../../LICENSE)

[📚 Monorepo 文档](../../README.md) · [📦 包结构](../../README.md#包结构) · [💻 GitHub](https://github.com/richie696/richie696-react-library) · [🐛 Issues](https://github.com/richie696/richie696-react-library/issues) · [🤝 贡献](../../CONTRIBUTING.md) · [🛡️ 安全](../../SECURITY.md) · [📄 License](../../LICENSE)


Web Crypto based digest, encoding, signing and ECDH/AES-GCM helpers.

## Installation

```bash
pnpm add @richie696/react-framework-security
```

## Public capabilities

- `sha256Hex` for SHA-256 hexadecimal digests.
- `HmacSha256Signer` for HMAC-SHA-256 signing and verification.
- `RsaPssSha256Signer` and `RsaPssSha256Verifier` for RSA-PSS/SHA-256.
- `importRsaPssPrivateKey` and `importRsaPssPublicKey` for PKCS#8/SPKI keys.
- `EccCryptoSession` for P-256 ECDH key exchange and AES-GCM payload encryption.
- Base64, PEM and binary input conversion helpers.

## Example

```ts
import { HmacSha256Signer } from '@richie696/react-framework-security';

const signer = new HmacSha256Signer('server-agreed-secret');
const signature = await signer.sign('payload');
const valid = await signer.verify('payload', signature);
```

Web Crypto must be available. A secret embedded in browser code can be extracted by the end user; HMAC is therefore not a standalone authentication boundary. Define canonicalization, key provisioning and replay policy with the server.

See the repository [LICENSE](../../LICENSE) and [security policy](../../SECURITY.md).
