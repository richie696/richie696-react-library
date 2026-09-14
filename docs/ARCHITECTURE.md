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
| `AbstractService` | `HttpClient` + `useRequest` | 请求编排与视图生命周期分离 |
| `Url` / `Method` | `Url` / `HttpMethod` | 类型化路径、查询和方法 |
| `ApiResult` / `AppError` | 同名协议模型 | 统一错误分类，不泄露原始异常 |
| `EventManager` | `EventBus` + `useEvent` | 返回 unsubscribe，observer 异常隔离 |
| `LocalStorage` | `StorageAdapter` / `BrowserStorage` | 可注入，SSR 默认使用 `MemoryStorage` |
| SSE parser | `parseEventStream` | AsyncGenerator，适合 React 事件流 |
| Java 风格锁工具 | `AsyncMutex` / `SingleFlight` | 只保留 JS 异步模型真正需要的同步原语 |
| 设备标识 | `DeviceIdentity` | 只生成随机设备 ID，不默认采集指纹 |
| 国际化 | `Translator` | 字典、回退 locale 和插值均由应用注入 |
| 摘要与请求头 | `sha256Hex` / `ManagedHeadersStore` | 使用 Web Crypto 和标准 Headers，不绑定 UI 或 HTTP provider |

不把 Angular 的 class/component 生命周期、装饰器或 UI prompt API 翻译到 React；
React 侧遵循函数组件、hooks、context 和显式服务对象的社区惯例。

## 版本策略

- React peer 依赖从 `19.0.0` 起，当前开发基线为 `19.3.x`。
- core 与 React bindings 独立版本，新增能力优先使用 additive API。
- 浏览器存储、Web Crypto 和 `fetch` 都通过小接口隔离，方便未来 React Native 或 SSR 适配。
