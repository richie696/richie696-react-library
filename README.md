# @richie696/react-framework

[![npm version](https://img.shields.io/npm/v/%40richie696%2Freact-framework?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/react-framework)
[![npm downloads](https://img.shields.io/npm/dm/%40richie696%2Freact-framework?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/react-framework)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-react-library?logo=github&label=stars)](https://github.com/richie696/richie696-react-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-react-library?logo=github&label=issues)](https://github.com/richie696/richie696-react-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-react-library?logo=opensourceinitiative&label=license)](LICENSE)

[📦 Core npm](https://www.npmjs.com/package/@richie696/react-framework) · [💻 GitHub](https://github.com/richie696/richie696-react-library) · [📚 文档](docs/RICHIE_FOUNDATION_USAGE.md) · [🐛 Issues](https://github.com/richie696/richie696-react-library/issues) · [🤝 贡献](CONTRIBUTING.md) · [🛡️ 安全](SECURITY.md) · [📄 License](LICENSE)


------

仓库级 React 基础库工程，采用 pnpm monorepo 结构，包含 1 个框架无关核心包、3 个能力扩展包和 1 个 React 绑定包。

当前所有可发布包统一为 `1.0.0`。运行要求：Node.js `>=20`、pnpm `10.x`、React `>=19.0.0`（仅 React 绑定包需要）。

## 架构定位

`@richie696/react-framework` 是框架无关的底座，基于标准 `fetch`、`AbortController`、Web Crypto、Web Storage 和 React 外部 Store 契约实现通用能力。React 绑定包只负责把这些能力接入组件树，不把请求、并发和安全逻辑写死在 UI 组件中。

业务代码可以只安装 Core，也可以按需组合并发、安全、浏览器指纹和 React Hooks 包；不使用 React 的 Node.js、SSR 或其他渲染环境仍可直接使用框架无关包。

## 包结构

- `@richie696/react-framework`（Core）
  - HTTP 请求、SSE、URL 模型、标准响应模型、错误归一化、请求重试、取消、防重复提交、托管请求头、存储、设备标识、事件总线和响应式状态服务
- `@richie696/react-framework-concurrency`
  - `AsyncMutex`、`ReentrantLock`、`ReadWriteLock`、`StampedLock`、`Condition`、`SingleFlight` 等异步并发工具
- `@richie696/react-framework-security`
  - SHA-256 摘要、ECDH 密钥交换、AES-GCM 加解密、HMAC-SHA256 签名、RSA-PSS-SHA256 签名与验签
- `@richie696/react-framework-browser-fingerprint`
  - 浏览器特征采集、指纹序列化与哈希、相似度计算、HMAC 签名设备指纹请求头
- `@richie696/react-framework-react`
  - `ReactFrameworkProvider`、`useReactFramework`、`useRequest`、`useEvent`、`useOnlineStatus` 等 React Provider 与 Hooks

## 组件与模块职责

### Core：`@richie696/react-framework`

- `HttpClient` / `GatewayClient`：统一处理 HTTP 请求、响应信封、超时、取消、重试、401 回调、请求/响应拦截器和 SSE 流式响应。
- `Url` / `defineUrl` / `HttpMethod`：以类型化模型描述接口地址、路径参数、查询参数、请求方法、加密标记和防重复提交标记。
- `ApiResult` / `Page` / `AppError`：统一服务端响应结构、分页结构和网络/协议/取消/超时等错误分类。
- `StateStore` / `ReadonlyStore`：提供可订阅的不可变外部状态快照，适合与 `useSyncExternalStore` 组合。
- `ObservableResource`：管理一个可取消异步资源的 idle/loading/success/error 状态，并防止过期请求覆盖新结果。
- `PollingStore` / `TimeSeriesStore`：提供带超时、重试、无重叠策略的轮询，以及有界时序数据窗口。
- `EventBus`：提供类型化事件发布订阅，适合登录态、配置刷新和跨模块通知。
- `BrowserStorage` / `MemoryStorage` / `DeviceIdentity`：统一浏览器与 SSR 存储，并维护可持久化的设备 ID。
- `ManagedHeadersStore` / `DuplicateRequestGuard`：缓存允许的服务端请求头，并在时间窗口内拦截重复请求。

### 并发包：`@richie696/react-framework-concurrency`

- `AsyncMutex`：异步互斥，保证同一时刻只有一个任务进入临界区。
- `ReentrantLock`：支持同一 owner 在嵌套异步流程中重复获取同一把锁。
- `ReadWriteLock`：读多写少场景下分离读锁和写锁。
- `StampedLock`：提供乐观读校验和悲观读/写锁。
- `Condition`：让任务等待条件满足后再继续，并支持超时与取消。
- `SingleFlight`：合并同一 key 的并发任务，避免重复请求或重复初始化。

### 安全包：`@richie696/react-framework-security`

- `sha256Hex`：对文本或二进制输入计算 SHA-256 十六进制摘要。
- `EccCryptoSession`：执行 ECDH 密钥交换，并基于 AES-GCM 加密和解密请求数据。
- `HmacSha256Signer`：提供 HMAC-SHA256 签名与验签。
- `RsaPssSha256Signer` / `RsaPssSha256Verifier`：提供 RSA-PSS-SHA256 签名与验签，以及公私钥导入工具。
  - `toBytes`、`bytesToBase64`、`base64ToBytes`、`pemToBytes`：处理文本、字节数组、Base64 和 PEM 密钥材料。

### 浏览器指纹包：`@richie696/react-framework-browser-fingerprint`

- `BrowserHardwareFingerprintCollector`：按显式配置采集浏览器、Canvas、WebGL、屏幕和运行时特征。
- `generateHardwareFingerprint`：生成一次浏览器特征快照。
- `fingerprintToString` / `fingerprintFromString` / `fingerprintToHash`：序列化、还原和哈希指纹。
- `calculateFingerprintSimilarity`：比较两次特征快照的相似度。
- `SignedHardwareFingerprintProvider` / `createHmacHardwareFingerprintProvider`：生成可注入 HTTP 请求头的签名指纹值。

### React 包：`@richie696/react-framework-react`

- `ReactFrameworkProvider`：在组件树中创建并管理 `HttpClient`、Storage 和类型化 `EventBus`。
- `useReactFramework`：读取 Provider 提供的底座服务。
- `useRequest` / `useHttpClient`：执行可取消请求，返回 loading、data、error、execute 和 cancel。
- `useExternalSnapshot`：将 Core 的外部 Store 接入 React 的并发渲染模型。
- `useObservableResource`：把 `ObservableResource` 映射为 React Hook 状态。
- `useEvent`：订阅并自动清理类型化事件。
- `useOnlineStatus`：订阅浏览器在线/离线状态。

这些包按能力独立发布，Core 保持框架无关；各包的 npm 页面和独立 README 见下方 [文档入口](#文档入口)。

## 目录说明

```text
packages/
  framework/             # Core：请求、响应式服务、事件、存储与通用模型
  concurrency/           # 异步并发原语
  security/              # Web Crypto 安全能力
  browser-fingerprint/   # 浏览器特征采集与签名设备指纹
  react/                 # React Provider 与 Hooks
tests/                   # 核心能力回归测试
docs/                    # 架构、编码、UI/UE 与使用文档
```

## 何时使用哪个包

- 只需要请求、URL、事件、存储和响应式基础能力：安装 `@richie696/react-framework`
- 需要锁、条件变量或 single-flight：额外安装 `@richie696/react-framework-concurrency`
- 需要加密、摘要或签名：额外安装 `@richie696/react-framework-security`
- 需要采集并发送浏览器特征：额外安装 `@richie696/react-framework-browser-fingerprint`
- 需要在 React 组件中使用 Provider 和 Hooks：安装 `@richie696/react-framework-react`
- 非 React 环境也可以直接使用 Core、并发、安全和浏览器指纹包

## 能力总览

| 能力模块 | 主要内容 | 适用场景 |
| --- | --- | --- |
| HTTP 与网关请求 | `HttpClient`、`GatewayClient`、拦截器、超时、取消、重试、SSE | 统一 API 调用与流式响应 |
| 请求协议模型 | `Url`、`defineUrl`、`HttpMethod`、`ApiResult`、`Page` | 统一 URL、方法和响应契约 |
| 请求安全策略 | ECDH/AES-GCM、HMAC/RSA-PSS、请求头管理、设备 ID、防重复提交 | 加密接口、签名协议和幂等控制 |
| 响应式服务 | `StateStore`、`ObservableResource`、`PollingStore`、`TimeSeriesStore` | 外部状态、异步资源、轮询和时序数据 |
| 事件通信 | 类型化 `EventBus` | 跨模块广播与低耦合通信 |
| 并发控制 | 可重入锁、读写锁、乐观读锁、条件变量、互斥与 single-flight | 异步临界区、读多写少和请求合并 |
| React 集成 | Provider、请求 Hook、事件 Hook、在线状态 Hook | 在组件树中复用底座服务 |

## 快速开始

### 1) 安装依赖

只使用 Core：

```bash
pnpm add @richie696/react-framework
```

在 React 应用中使用：

```bash
pnpm add @richie696/react-framework @richie696/react-framework-react react react-dom
```

按需安装扩展能力：

```bash
pnpm add @richie696/react-framework-concurrency
pnpm add @richie696/react-framework-security
pnpm add @richie696/react-framework-browser-fingerprint
```

### 2) 构建与验证

```bash
pnpm install
pnpm run build
pnpm run typecheck
pnpm test
```

### 3) 在 React 应用中使用

```tsx
import {
  ReactFrameworkProvider,
  useRequest,
} from '@richie696/react-framework-react';

function UserPanel() {
  const request = useRequest<{ name: string }>('/api/user');

  return (
    <button type="button" onClick={() => void request.execute()} disabled={request.loading}>
      {request.loading ? 'Loading...' : request.data?.name ?? 'Load user'}
    </button>
  );
}

export function App() {
  return (
    <ReactFrameworkProvider options={{ baseUrl: 'https://example.com' }}>
      <UserPanel />
    </ReactFrameworkProvider>
  );
}
```

Core 能力也可以脱离 React 使用：

```ts
import { HttpClient } from '@richie696/react-framework';
import {
  createHmacHardwareFingerprintProvider,
} from '@richie696/react-framework-browser-fingerprint';

const http = new HttpClient({
  baseUrl: '/api',
  sendHardwareFingerprint: true,
  hardwareFingerprintProvider:
    createHmacHardwareFingerprintProvider(runtimeSecret),
});
```

## 常用脚本

- `pnpm run build`：按 workspace 顺序构建全部包
- `pnpm run typecheck`：构建后执行全部包的 TypeScript 类型检查
- `pnpm test`：构建并执行 `tests/` 下的 Node.js 回归测试
- `pnpm run clean`：清理全部包的构建产物

## 发布说明（建议流程）

1. 确认所有包版本统一为 `1.0.0`
2. 执行 `pnpm run build`、`pnpm run typecheck` 和 `pnpm test`
3. 登录公开 npm registry，并按依赖顺序发布

```bash
pnpm login --registry=https://registry.npmjs.org/

cd packages/concurrency
pnpm publish --access public --registry=https://registry.npmjs.org/

cd ../security
pnpm publish --access public --registry=https://registry.npmjs.org/

cd ../browser-fingerprint
pnpm publish --access public --registry=https://registry.npmjs.org/

cd ../framework
pnpm publish --access public --registry=https://registry.npmjs.org/

cd ../react
pnpm publish --access public --registry=https://registry.npmjs.org/
```

并发、安全和浏览器指纹包应先于 Core 发布，React 绑定包最后发布。

## 文档入口

### npm 包

- [Core：`@richie696/react-framework`](https://www.npmjs.com/package/@richie696/react-framework) · [README](packages/framework/README.md)
- [并发：`@richie696/react-framework-concurrency`](https://www.npmjs.com/package/@richie696/react-framework-concurrency) · [README](packages/concurrency/README.md)
- [安全：`@richie696/react-framework-security`](https://www.npmjs.com/package/@richie696/react-framework-security) · [README](packages/security/README.md)
- [浏览器指纹：`@richie696/react-framework-browser-fingerprint`](https://www.npmjs.com/package/@richie696/react-framework-browser-fingerprint) · [README](packages/browser-fingerprint/README.md)
- [React：`@richie696/react-framework-react`](https://www.npmjs.com/package/@richie696/react-framework-react) · [README](packages/react/README.md)

- 架构说明：[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 底座 API 使用指南：[`docs/RICHIE_FOUNDATION_USAGE.md`](docs/RICHIE_FOUNDATION_USAGE.md)
- React 工程规范：[`docs/REACT_ENGINEERING_STANDARD.md`](docs/REACT_ENGINEERING_STANDARD.md)
- React 编码规范：[`docs/REACT_CODING_STANDARD.md`](docs/REACT_CODING_STANDARD.md)
- React UI/UE 规范：[`docs/REACT_UI_UX_STANDARD.md`](docs/REACT_UI_UX_STANDARD.md)
- React 项目骨架：[`docs/REACT_PROJECT_SKELETON.md`](docs/REACT_PROJECT_SKELETON.md)
- 并发与安全测试计划：[`docs/testing/CONCURRENCY_SECURITY_TEST_PLAN.md`](docs/testing/CONCURRENCY_SECURITY_TEST_PLAN.md)

## 设计原则

- Core 与 React 绑定解耦，通用能力不依赖 React 或具体 UI 组件库
- 业务代码优先面向稳定契约（HTTP、事件、Store、Provider 和 Hook）
- 并发、安全和浏览器指纹按能力独立分包，按需安装
- 通过依赖注入和拦截器保留 fetch、存储和请求策略的替换空间
- 应用层负责路由、主题、业务 API 和领域状态，基础库只提供通用能力

## 能力边界

- 锁和条件变量只协调同一 JavaScript 运行时中的异步任务，不提供跨标签页、跨进程或分布式锁。
- 浏览器指纹采集是显式 opt-in 能力，受浏览器权限、隐私策略和 SSR 环境限制；Core 默认只使用持久化设备 ID。
- 浏览器端 HMAC 密钥可以被最终用户提取，不能作为真正的认证边界；RSA-PSS 只提供密码学原语，不替应用定义密钥分发和 HTTP 规范化协议。
- ECDH/AES-GCM 请求加密依赖服务端完成对应的密钥交换、请求头和响应协议。
- React Hooks 必须在对应的 `ReactFrameworkProvider` 和 React 运行时中使用；Core 包本身不负责 UI 展示、路由和业务状态管理。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
