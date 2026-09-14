# React 底座架构

## 分层

```text
应用 / Next.js / React DOM
        ↓
@richie696/react-framework-react  (Provider + hooks)
        ↓
@richie696/react-framework        (无 React 的协议与基础能力)
```

`framework` 不依赖 React、路由器或 UI 组件库，因此可以被 React DOM、React
Native、Next.js、Remix 或 Node-side rendering 代码复用。`framework-react` 只负责
把这些能力以 React 19 的 hooks 和 context 暴露出来。

## 能力映射

| Angular 底座能力 | React 版本 | 设计取舍 |
| --- | --- | --- |
| `AbstractService` | `HttpClient` / `GatewayClient` + `useRequest` | 请求编排与视图生命周期分离；核心服务不继承 React 组件 |
| `Url` / `Method` | `Url` / `HttpMethod` + `defineUrlCatalog` | 不可变 endpoint 描述、类型化路径/查询/方法，不使用全局动态 URL |
| `ApiResult` / `AppError` | 同名协议模型 | 统一错误分类，不泄露原始异常 |
| `EventManager` | RxJS-backed `EventBus` + `useEvent` | RxJS 只在 core 内部，公共面仍是 typed facade，observer 异常隔离 |
| 响应式状态 | `StateStore` + `useExternalSnapshot` | immutable snapshot + `useSyncExternalStore`，不把 Subject 暴露给业务 |
| 异步资源 | `ObservableResource` + `useObservableResource` | 统一 idle/loading/success/error/cancel 生命周期，过期请求不能覆盖新结果 |
| 轮询刷新 | `PollingStore` | `exhaustMap` 防重叠、超时/有界重试、保留 last-known-good 数据 |
| 监控时序 | `TimeSeriesStore` | 有界 immutable 时间窗口，直接供 ECharts 等图表适配 |
| 网络状态 | `useOnlineStatus` | 订阅浏览器 online/offline 事件，SSR 有稳定快照 |
| `LocalStorage` | `StorageAdapter` / `BrowserStorage` | 可注入，SSR 默认使用 `MemoryStorage` |
| SSE parser | `parseEventStream` | AsyncGenerator，适合 React 事件流 |
| Java 风格锁工具 | `AsyncMutex` / `SingleFlight` | 只保留 JS 异步模型真正需要的同步原语 |
| 设备标识 | `DeviceIdentity` | 只生成随机设备 ID，不默认采集指纹 |
| 国际化 | `Translator` | 字典、回退 locale 和插值均由应用注入 |
| 摘要与请求头 | `sha256Hex` / `ManagedHeadersStore` | 使用 Web Crypto 和标准 Headers，不绑定 UI 或 HTTP provider |

## HTTP 服务契约

`HttpClient` 是一个可注入的服务对象，不要求应用使用特定路由器、状态库或 UI
组件。它把 Angular `AbstractService` 中的横切能力集中在请求边界：

- `request<T>()` 返回结构化 `ApiResult<T>`；`requestData<T>()` 是只取 `data` 的便捷方法。
- `Url` 可以声明 HTTP 方法、路径参数、重复提交保护和端到端加密意图；GET 对象参数会转为 query，数组参数会填充 `{placeholder}`。
- GET/HEAD/OPTIONS 默认最多重试 `maxRetries` 次；POST/PUT/PATCH/DELETE 只有显式 `idempotencyKey` 才允许重试。408、425、429、5xx、网络和超时错误遵循有界指数退避与 `Retry-After`。
- 每次请求都有独立超时和取消信号；错误统一为 `AppError`，保留 status、code、requestId、traceId、响应体和 retry-after，而不把原始异常直接泄露给页面。
- 可选的 loading 回调使用计数器，多个并发请求不会提前关闭全局 loading；401 会清理受管凭证并调用 `onUnauthorized`。
- `ManagedHeadersStore` 只缓存显式白名单响应头，带 TTL 和可选 `StorageAdapter` 持久化；`Authorization`、Cookie 等敏感头永不自动保存。
- `requestStream<T>()` 返回 `AsyncGenerator`，解析标准 SSE 多帧消息，支持 `kind=done/error` 控制帧、取消和自定义 data parser。
- `Url.needEncryption` 启用 Web Crypto ECDH P-256/AES-GCM 握手与请求加密；密钥生命周期由 `initializeEncryption()` 和 `cleanup()` 管理。

这些能力均可通过构造函数注入 `fetch`、存储、拦截器和回调进行替换，测试时不需要
启动真实服务器。浏览器、SSR、React Native 等宿主只需提供相应的标准 API 适配。

不把 Angular 的 class/component 生命周期、装饰器或 UI prompt API 翻译到 React；
React 侧遵循函数组件、hooks、context 和显式服务对象的社区惯例。

## Dashboard 响应式边界

`@richie696/react-framework` 的 reactive 目录只提供与 UI 无关的状态编排能力：

- `StateStore<T>` 是同步、可订阅的只读快照源；状态更新通过 `set`/`update` 完成，
  相等值不会产生无意义通知。
- `ObservableResource<T>` 负责一次异步资源的生命周期。每次 `load` 都有独立代次，
  被取消或过期的加载不能覆盖当前快照；业务层只处理结构化 `ResourceSnapshot`。
- `PollingStore<T>` 用于规则、实例和监控数据刷新。轮询请求采用 `exhaustMap`，上一轮
  未完成时不会并发发起下一轮；超时和有限重试后保留已知数据并暴露错误状态。
- `TimeSeriesStore<T>` 只保留配置的最大点数，追加和裁剪均返回新的数组快照，适合
  QPS、RT、CPU/内存等图表数据，不承担长期历史存储。

React 绑定通过 `useSyncExternalStore` 读取这些快照，因此并发渲染下的订阅和清理由
React 负责。RxJS 仅作为内部实现工具，业务组件不需要导入 `Observable`、`Subject` 或
operator；若未来更换响应式实现，以上 public contract 保持不变。

## 版本策略

- React peer 依赖从 `19.0.0` 起，当前开发基线为 `19.3.x`。
- core 与 React bindings 独立版本，新增能力优先使用 additive API。
- 浏览器存储、Web Crypto 和 `fetch` 都通过小接口隔离，方便未来 React Native 或 SSR 适配。
