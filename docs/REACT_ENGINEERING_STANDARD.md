# React 工程职责与皮肤规范

适用于使用 `@richie696/react-framework`、`@richie696/react-framework-react` 的 React 19 产品。它规定代码所有权与依赖方向，不要求把 Angular 的继承式组件、装饰器或生命周期照搬到 React。优先使用 TypeScript、函数组件、Hooks、显式服务对象与 CSS Modules；已有 JavaScript 原型按功能逐步迁移。

## 1. 两个层次的所有权

| 所在位置 | 拥有内容 | 不拥有内容 |
| --- | --- | --- |
| `packages/framework` | 无 React 的 URL、HTTP、错误、存储、事件、SSE、异步状态、轮询、时序与国际化原语 | 产品 API 路径、Sentinel 规则、路由、DOM、主题和组件 |
| `packages/react` | Provider、Context、把底座状态安全接入 React 的 Hooks | 产品状态、业务请求编排、UI 组件、图表和皮肤 |
| 产品 `core` | 一次性装配、路由、全局协议适配、应用级主题和 locale | 规则业务流程和页面私有状态 |
| 产品 `shared` | 两个以上 feature 实际复用的业务中性 UI/Hook/格式化能力 | 单个 feature 的模型、接口或规则 |
| 产品 `features/<name>` | 一个业务域的请求、规则、状态、页面、组件与局部样式 | 其它 feature 的私有实现和应用级单例 |

依赖只能向下：`app/bootstrap → features → shared → core → @richie696/*`。`core` 不导入 feature；feature 之间不能通过深层路径互取组件、store 或 DTO。跨 feature 共享稳定能力时，先确认真正的第二个消费者，再提升到 `shared` 或显式导出的 feature 契约。不要为一次调用发明空接口。

## 2. 产品目录与文件职责

以下是一种完整功能的目标形态。空目录不预创建；简单功能可以少文件，但不合并不同变化原因。

```text
src/
├── app/
│   ├── bootstrap/                 # createRoot、全局错误边界、运行时配置
│   ├── providers/                 # 根 Provider 装配；稳定 options 与实例
│   ├── router/                    # 路由表、lazy import、权限/错误边界
│   └── shell/                     # 导航、顶栏、内容区域及 shell.module.scss
├── core/
│   ├── api/                       # 应用级 HttpClient 配置与响应/错误适配
│   ├── events/                    # 应用级事件 payload map 和命名常量
│   ├── i18n/                      # locale 注册、字典加载、格式化策略
│   ├── session/                   # 会话与身份上下文；不持久化敏感凭证
│   └── styles/
│       ├── themes/                # _dark.scss、_light.scss：仅 token 值
│       ├── tokens/                # _structure.scss、_mixins.scss
│       ├── patterns/              # 真正跨 feature 的 shell/overlay 样式
│       └── index.scss             # 唯一全局样式入口
├── shared/
│   ├── ui/                        # 业务中性组件及其 *.module.scss
│   ├── hooks/                     # 业务中性组合 Hook
│   ├── format/                    # 纯格式化函数；时间/数值等
│   └── types/                     # 多 feature 共用且稳定的契约
└── features/
    └── rules/
        ├── api/
        │   ├── rule.endpoints.ts  # defineUrlCatalog；仅端点、方法、行为标志
        │   ├── rule.dto.ts        # 线上的请求/响应形状
        │   └── rule.gateway.ts    # HttpClient 调用、DTO 解析和错误映射
        ├── model/
        │   ├── rule.types.ts      # 领域/视图类型；两者不同则分文件
        │   ├── rule.policy.ts     # 可纯测的规则与决策；无 DOM/HTTP
        │   └── rule.mapper.ts     # DTO ↔ 领域/视图转换
        ├── application/
        │   └── rule-workflow.ts   # 用例编排；草稿、校验、发布的边界
        ├── state/
        │   ├── rule.store.ts      # feature 范围的状态与命令
        │   └── use-rule-draft.ts  # 把 store/服务接入 React，负责订阅清理
        ├── ui/
        │   ├── RulesPage.tsx      # 路由容器：组合视图、导航和用户命令
        │   ├── RuleTable.tsx      # 纯展示与局部交互；显式 props/callback
        │   ├── RuleEditor.tsx     # 表单交互；复杂字段再拆子组件
        │   └── *.module.scss     # 与组件同目录；局部选择器
        ├── i18n/                 # 本 feature 的 zh-CN/en-US/ja-JP 文案
        └── tests/                # 契约、规则、状态、关键交互测试
```

`*.endpoints.ts` 不发请求；`*.gateway.ts` 不决定 UI；`*.policy.ts` 不读网络；`*.store.ts` 不渲染 DOM；`use-*.ts` 不写协议解析；`*Page.tsx` 不包含 DTO 转换、轮询算法或大段规则判断；`*.module.scss` 不写全局主题值。`index.ts` 只暴露经评审的公共入口，不用 barrel 重新导出整个 feature 内部。命名表达业务名词和变化原因，禁止 `utils.ts`、`common.ts`、`data.ts` 变成杂物间。

同一组件的 JSX、局部事件与少量派生显示值可以同文件；拆分依据是独立职责或独立复用，不以机械行数作唯一标准。一个文件同时管理路由、HTTP、草稿状态、规则校验、图表配置和页面渲染时必须拆分。新增功能不得继续扩充既有的巨型 `App.jsx` 或全局 `styles.css`。

## 3. React 状态和服务边界

| 状态/行为 | 放置位置 | 用法 |
| --- | --- | --- |
| 输入框、展开、选中项、临时过滤器 | 最近的组件或 feature Hook | `useState`/`useReducer`；不放全局 Context |
| URL 可分享的筛选、分页和定位 | 路由查询参数 | 编解码集中在 router/feature 边界 |
| 一次异步资源 | feature service + `ObservableResource` | UI 用 `useObservableResource`；取消与过期结果由资源对象管理 |
| 定期刷新实例、规则或指标 | feature service + `PollingStore` | 定义间隔、超时、重试与停止时机；UI 用 `useExternalSnapshot` |
| 有界实时图表窗口 | feature service + `TimeSeriesStore` | 图表组件只接受点列、单位与显示配置 |
| 跨组件共享且需要外部订阅的 feature 状态 | feature `StateStore` | 写入只经 feature 命令；UI 用 `useExternalSnapshot` |
| 一次请求按钮 | feature service；简单场景可 `useRequest` | 仅在明确用户动作中执行，不能把 Hook 当通用数据层 |
| 已发生事实的跨职责通知 | typed `EventBus` + `useEvent` | 定义 payload、发布时机和订阅生命周期；父子组件仍用 props/callback |

长期服务对象、store、poller 不在 render 函数体内反复 `new`。由 app/feature Provider 或稳定的 `useMemo`/`useRef` 创建，并在拥有者卸载时停止、取消或完成。Provider 的 `options` 必须保持稳定；不要在 JSX 中每次创建新对象，否则底座实例可能重建。`useEffect` 用于订阅、浏览器 API 与资源生命周期，用户操作由事件处理器触发；不要用 effect 代替命令或写入流程。

Core 可用 OOP 来封装状态、协议和生命周期；React 视图保持函数组件与 Hooks。两者通过小契约协作，不创建 `AbstractPage`/`BaseComponent` 继承树。

## 4. 已发布底座 API 的使用位置

| API | 推荐位置与场景 | 不应出现于 |
| --- | --- | --- |
| `ReactFrameworkProvider`, `useReactFramework` | `app/providers` 装配；少量 framework adapter 读取服务 | 每个页面重复 Provider，随意重建 options |
| `Url`, `HttpMethod`, `defineUrlCatalog` | `features/*/api/*.endpoints.ts` 的稳定端点表 | JSX 中拼路径、魔法方法字符串 |
| `HttpClient`, `GatewayClient`, `ApiResult`, `AppError` | `core/api` 配置与 feature `*.gateway.ts` 调用、归一化 | 展示组件直接 `fetch`、重复解析错误 |
| `useHttpClient`, `useRequest` | 极简请求交互或应用适配 Hook | 复杂规则发布工作流、隐式自动加载所有页面 |
| `ObservableResource`, `useObservableResource` | 一次可取消异步加载；feature 服务创建资源，Hook 订阅 | 在每次 render 中创建资源 |
| `PollingStore`, `useExternalSnapshot` | 多次有界刷新，加载器与停止时机由 feature 持有 | 在图表组件内散落 `setInterval` |
| `TimeSeriesStore` | 实时监控 feature 的有界样本窗口 | 充当历史数据库或持久化事实源 |
| `StateStore`, `useExternalSnapshot` | 多消费者的 feature 共享快照 | 每个本地 tab/弹窗都建全局 store |
| `EventBus<Events>` | feature/application 持有的业务事件契约；显式管理订阅与生命周期 | 普通父子回调、请求结果的同步返回 |
| `FrameworkEventName`, `useEvent` | 仅现有 `FrameworkEvents` 定义的全局事件 | 当成任意 feature 事件的通用 Hook |
| `parseEventStream` | feature 数据层消费 SSE | 组件自行拆帧或持有 `Response` |
| `Translator`, `I18nDictionary` | `core/i18n`、feature 翻译资源；界面只取正式名称 | 字段名直接当标签、UI 硬编码多语言分支 |
| `StorageAdapter`, `BrowserStorage`, `MemoryStorage` | `core` 中的非敏感偏好与 schema/迁移封装 | 组件直接写 localStorage 或存 token/secret |
| `AsyncMutex`, `SingleFlight` | 明确的串行临界区或共享一次加载 | 每个 Promise、普通并行请求都加锁 |
| `ManagedHeadersStore`, `DeviceIdentity`, `EccCryptoSession` | 应用级协议/安全适配，按已确认服务端契约启用 | 页面、表单或 UI 库内部 |
| `useOnlineStatus` | shell 的浏览器网络状态提示 | 当作 API、配置中心或 Agent 服务可用性的证明 |

这些是 `0.1.0` 的能力与推荐使用边界，不承诺它们已解决 dashboard 的缓存、权限、规则版本、写回和审计。真实规则发布由产品的 feature workflow 与后端契约承担。

`0.1.0` 的 `FrameworkEvents` 已包含 `ruleUpdated`，这是产品语义泄入通用 React 绑定的历史 API。为保持已发布版本兼容，现阶段不删除它；新业务事件用 feature 自有的 `EventBus<Events>` 定义，并由拥有者管理订阅。未来若提供业务事件 Hook，应以可注入的 typed bus 扩展，而不是继续往 `FrameworkEvents` 加产品字段。

## 5. SCSS 皮肤系统

底座核心不发布某个产品的 SCSS、颜色或 Material/其他组件库样式。皮肤由产品拥有；第二个产品确实复用时，再抽取独立的可选 design-system 包。样式文件的所有权如下：

| 文件 | 唯一职责 |
| --- | --- |
| `core/styles/themes/_dark.scss`、`_light.scss` | 给同一组语义 CSS 变量赋值；含图表 palette；不能包含页面选择器 |
| `core/styles/tokens/_structure.scss` | spacing、radius、typography、motion、layout、breakpoint 等结构默认值；不决定品牌色 |
| `core/styles/tokens/_mixins.scss` | 少量需参数化/重复的 SCSS mixin；不复制组件规则 |
| `core/styles/patterns/*.scss` | 真正跨 feature 的壳层/覆盖层模式 |
| `core/styles/index.scss` | 唯一全局入口：theme → structure → reset → patterns；仅此处进入 app bootstrap |
| `shared/ui/*/*.module.scss` | 通用组件局部样式，消费语义变量 |
| `features/*/ui/*.module.scss` | feature 局部样式，消费语义变量和结构 token |

主题使用 `html[data-theme='dark'|'light']` 或同等稳定属性切换；运行时只切 token，避免每个组件各自判断主题。首屏主题需在 React 挂载前按用户偏好/系统偏好设定，避免闪烁；尊重 `prefers-reduced-motion`、高对比和浏览器缩放。色彩、背景、文字、边框、状态、图表线色、网格线、tooltip 等以语义变量定义，例如 `--color-surface`、`--color-text-muted`、`--chart-qps`；组件不能依赖 `_dark.scss` 的具体值。设计 token 使用 `rem`/逻辑属性，1px hairline 等有意精确值可用 px；断点跟随 CSS viewport/container，不按设备型号。

SCSS 负责组织和复用，运行时皮肤值以 CSS 自定义属性承载。图表（ECharts/Recharts 等）通过一个 theme adapter 读取相同 token，不能在每个图表写一套颜色常量。第三方样式覆盖放在明确的 adapter/pattern 文件，禁止到处使用高权重选择器或 `!important`。引入 Sass 只需产品 devDependency，不让 `packages/framework` 或 `packages/react` 依赖 Sass。

## 6. 新功能交付检查

1. 写清 feature 的业务问题、数据所有者、端点与状态生命周期；确认同步调用还是已发生事实事件。
2. 按上述目录放置代码；目录缺失时按实际职责创建，不用占位文件。
3. 新增端点集中定义，新 UI 文案进 locale 文件，新视觉值进主题/结构 token。
4. 核对每个 `useEffect` 的外部同步对象和清理；核对请求取消、轮询停止、订阅释放及 Strict Mode 重挂载。
5. 校验导入方向和公共导出面；重复业务规则只留一份真源，复杂规则做纯逻辑测试。
6. 验证构建、关键交互、浅/深色与窄/宽视口；对图表核对单位、空值、时区和无数据状态。

现有 Sentinel Dashboard 原型的 `App.jsx`、`demoData.js`、`ruleI18n.js`、`styles.css` 是迁移输入，不能作为新 feature 的文件模板。迁移按一页或一个规则工作流为单位，保持现有交互与视觉基线；先拆数据、状态和展示，再迁移样式与主题，逐步完成 TypeScript 化。规范生效不等于现有原型已完成重构。
