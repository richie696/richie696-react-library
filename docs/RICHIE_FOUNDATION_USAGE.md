# Richie React 底座 API 使用指南

这是 `@richie696/react-framework@1.0.2` 及其 React、并发、安全和浏览器指纹扩展包的使用边界，面向任意 React 产品。通用 UI/UE、编码和项目骨架要求分别见[规范索引](REACT_ENGINEERING_STANDARD.md)。升级依赖时先核对安装包的公开导出与行为；本指南不以 Angular 同名能力推断 React 契约。

基础包不依赖 React、路由器或 UI 组件库。React 包提供 Provider 与 Hooks；产品仍拥有 endpoint、DTO、业务规则、权限、主题、页面和设计系统。

## API → 所有者 → 场景

| 已发布 API | 推荐归属与适用场景 | 边界 |
| --- | --- | --- |
| `ReactFrameworkProvider` | `app/providers` 一次装配 HTTP、存储与事件服务；options 保持稳定 | 不在每个页面重复创建，不把 feature 状态塞入根配置 |
| `useReactFramework`, `useHttpClient` | 应用/feature 适配 Hook 读取已装配服务 | 展示组件不直接组织 HTTP 协议 |
| `Url`, `HttpMethod`, `defineUrl`, `defineUrlCatalog` | `features/*/api/*.endpoints.ts` 定义路径、方法和行为标志 | JSX 不拼 URL；请求参数仍由调用方按契约传入 |
| `HttpClient` | `core/api` 配置；feature gateway 发请求、处理 `ApiResult`/`AppError` | 页面不复制超时、重试、401、重复提交与错误归一化 |
| `GatewayClient` | 与 `HttpClient` 相同的注入边界 | 当前是 `HttpClient` 的空子类，不代表额外网关协议能力 |
| `useRequest` | 简单、显式触发的一次请求交互 | 多阶段工作流、复杂缓存或所有页面自动加载不交给它 |
| `ObservableResource`, `useObservableResource` | feature 持有一次可取消异步资源，Hook 渲染状态 | 不在每次 render 中 `new`；调用方处理取消和错误 |
| `PollingStore`, `useExternalSnapshot` | feature 持有定时刷新和只读快照；有界重试/超时与无重叠 | 不是后台任务调度器；拥有者卸载时停止/完成 |
| `TimeSeriesStore`, `useExternalSnapshot` | feature 持有有界时间窗口，图表只接收点列 | 不当长期历史库；图表单位与采样策略由产品定义 |
| `StateStore`, `ReadonlyStore`, `useExternalSnapshot` | 多组件读取同一 feature 状态，更新经 feature 命令 | 小型本地 UI 状态仍用 React 本地 state |
| `EventBus<Events>` | app/feature 拥有的类型化事实通知，订阅可取消 | 不代替父子 props/callback 或需要同步结果的函数调用 |
| `FrameworkEventName`, `useEvent` | 仅固定 `FrameworkEvents` 的订阅 | 目前不能直接接任意产品事件 payload map |
| `parseEventStream`, `HttpClient.requestStream` | feature 数据层处理 SSE 流、取消和错误 | 组件不自行拆流帧；流的重连/背压由产品决定 |
| `Translator`, `TranslationValues`（已弃用） | 仅保留现有调用兼容，计划在 **1.0.3** 移除 | 新代码直接使用 `i18next + react-i18next`，由产品装配实例与资源 |
| `I18nDictionary`, `ApiResult.i18n` | 数据层的响应协议 | 保留协议类型与字段，不属于翻译运行时的移除范围 |
| `StorageAdapter`, `BrowserStorage`, `MemoryStorage` | `core` 封装非敏感偏好；SSR/测试可换内存实现 | 不在组件散写存储，不存敏感凭证 |
| `ManagedHeadersStore` | `core/api` 的受管响应头协议适配 | 仅受支持的白名单头；不要把任意认证信息当持久数据 |
| `AsyncMutex`, `SingleFlight` | concurrency 包；具体临界区或共享一次加载 | 普通独立 Promise 不需要锁 |
| `ReentrantLock`, `Condition` | concurrency 包；同一 async runtime 内需要显式重入或条件等待 | 使用 `LockOwner`，不跨 Worker/标签页/进程 |
| `ReadWriteLock`, `StampedLock` | concurrency 包；读多写少或需要乐观版本校验 | 不支持隐式读锁升级；共享外部资源仍用服务端/分布式锁 |
| `DuplicateRequestGuard` | 数据层需要重复提交保护的边界 | 与服务端幂等/冲突策略分别定义 |
| `DeviceIdentity` | 应用有明确设备 ID 需求时的适配 | 不作为认证或高熵指纹默认方案 |
| `EccCryptoSession`, `sha256Hex` | security 包；与服务端约定匹配的协议/安全适配 | 不由页面自选加密策略；服务端契约不明时不启用 |
| `HmacSha256Signer`, `RsaPssSha256Signer/Verifier` | security 包；对已定义协议的消息签名/验签 | 只提供密码学原语，不自动定义 HTTP 签名协议；浏览器 HMAC 密钥不是秘密 |
| `BrowserHardwareFingerprintCollector` | browser-fingerprint 包；经产品明确启用的浏览器风险信号 | SSR 不可用；必须评估隐私、浏览器漂移和用户同意 |
| `SignedHardwareFingerprintProvider` | 注入 `HttpClient.hardwareFingerprintProvider` | 同时显式开启 `sendHardwareFingerprint`；服务端负责时钟、nonce 和相似度策略 |
| `useOnlineStatus` | shell 的浏览器网络提示 | 不能代表 API、网关或其它服务的健康状态 |

## 国际化迁移

自实现的 `Translator` 与其参数类型 `TranslationValues` 已弃用，将在 **1.0.3** 移除；移除前保留公开导出与既有行为。具体 React 项目推荐直接安装 `i18next + react-i18next`，底座不引入或封装这两个依赖。

- `app/i18n` 创建、初始化实例并汇总 feature 翻译资源；资源仍由各 feature 拥有，`core` 不反向导入 feature。
- React 组件直接使用 `react-i18next` 的 `useTranslation`，非 React 代码使用同一个 i18next 实例，避免并行维护第二套翻译运行时。
- 迁移时将 `{name}` 占位符改为 i18next 默认的 `{{name}}`，并核对缺失键、语言回退与动态翻译键的行为。
- `I18nDictionary` 与 `ApiResult.i18n` 属于响应协议，本次不弃用，也不计划随 `Translator` 删除。

接入方法见 [react-i18next 官方指南](https://react.i18next.com/latest/using-with-hooks)，提取与检查工具见 [i18next 官方提取文档](https://www.i18next.com/how-to/extracting-translations)。

## 组合示意

```text
页面/展示组件
  ↓ props + command
feature Hook / workflow
  ↓
feature gateway / store
  ↓
React Provider 或 framework-neutral 底座服务
  ↓
外部接口 / 浏览器能力
```

一个动作需要同步结果时由 workflow 调用 gateway 并返回结果；一个事实需要多个独立消费者响应时使用明确 payload 的事件。React Hooks 只负责 React 生命周期和渲染订阅，协议、缓存策略和业务规则留在其所有者服务中。对外部 store，底座提供的 `useExternalSnapshot` 基于 React 的订阅契约；store 实例与快照引用需稳定，SSR 场景另核对首屏快照。

## 当前版本的已知边界

- `FrameworkEvents` 的固定 payload map 已有 `ruleUpdated`。它带有产品语义，属于 `0.1.0` 的历史公开面；为兼容暂不删除。新产品事件应由自己的 `EventBus<Events>` 拥有，不继续扩充通用 map。
- `useEvent` 仅适用于上述固定 `FrameworkEvents`，不是任意 `EventBus<Events>` 的通用 Hook。需要产品事件的 React 订阅时，产品应提供自己的生命周期安全适配；未来可新增可注入的泛型 Hook。
- `useOnlineStatus` 只读浏览器 online/offline；真实服务健康要通过产品自己的健康协议验证。
- 底座没有产品主题、组件库适配、路由、权限决策、长期历史存储或业务工作流。把这些能力放入产品或独立扩展包，并分别验收。
- 并发锁是单 JavaScript runtime 的协作式原语，不是基于 `Atomics` 的跨 Worker 锁，也不是分布式锁。
- 浏览器硬件指纹默认不采集；HMAC 签名不能让嵌入前端的共享密钥成为可信认证秘密。
