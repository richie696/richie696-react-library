# React 编码规范

适用于 React 产品工程，不依赖某家状态库、路由器、请求库或 UI 组件库。以严格 TypeScript、函数组件、Hooks 和显式服务边界为默认；已有 JavaScript 工程可逐 feature 迁移。项目可选用不同工具，但职责、依赖方向与生命周期语义不能因为工具改变而消失。

## 1. 代码结构与命名

| 文件 | 只负责 | 命名示例 |
| --- | --- | --- |
| 页面容器 | 获取 feature 状态、组合区域、将用户动作映射为命令/导航 | `ItemsPage.tsx` |
| 展示组件 | 显式 props、渲染、局部交互与无副作用派生值 | `ItemTable.tsx` |
| 自定义 Hook | React 订阅/生命周期与可复用视图行为 | `useItemSelection.ts` |
| API endpoint | 不可变路径、方法、参数元数据 | `item.endpoints.ts` |
| gateway/adapter | 网络调用、协议解析、DTO 映射入口和错误归一化 | `item.gateway.ts` |
| DTO | 线上请求/响应形状；版本与可选字段精确表达 | `item.dto.ts` |
| model/policy | 领域值、纯计算、校验和决策 | `item.model.ts`, `item.policy.ts` |
| workflow/use case | 多步骤命令、竞态与事务/补偿边界 | `item.workflow.ts` |
| store | feature 范围状态、只读快照与显式命令 | `item.store.ts` |
| 常量/枚举式对象 | 有业务语义的固定值，避免魔法字符串/数字 | `item.constants.ts` |
| 样式 | 与组件同目录，只管该组件/feature 的选择器 | `ItemTable.module.scss` |

目录按实际职责创建；小组件的 JSX、局部事件和少量显示计算可以同文件。拆分条件是出现独立变化原因、生命周期、协议边界或第二个真实消费者，不是超过某个行数。`utils.ts`、`helpers.ts`、`common.ts`、`data.ts` 不能成为无所有者代码的收容处。重复业务规则合并到唯一归属；仅形状相似但语义不同的代码不强行抽象。

公共符号要有 JSDoc 说明用途、输入输出、生命周期/错误和重要限制；内部显而易见的代码不写复述语句的注释。外部协议字段与界面文案分别命名和维护。避免 `any`、非空断言滥用、宽泛 `Record<string, unknown>` 代替已知契约，以及无解释的布尔参数。

## 2. 组件、Hooks 与渲染纯度

- 组件在 render 阶段只读取 props/state 并计算 JSX；不发请求、不订阅、不写存储、不修改外部对象。列表使用稳定业务 key；不要用可能重排的数组下标。
- 局部输入、展开、选中和短暂反馈留在最近的组件。多个子组件共同需要时向最近共同父级提升；不要为了省 props 就把所有状态放进根 Context。
- 纯展示组件通过 props 和 callback 传递输入/事件。多步骤业务动作交给 feature workflow 或 Hook，组件只触发命令并展示结果。
- Hook 在顶层调用，不根据条件、循环或事件分支调用。自定义 Hook 名称以 `use` 开头，拥有的订阅、计时器、浏览器监听和请求取消需要在卸载与依赖变化时清理。
- `useEffect` 用于 React 与外部系统同步；派生渲染值直接计算，用户提交放事件处理器。依赖列表表达真实依赖，不能用 suppression 掩盖重跑或闭包问题。开发期 Strict Mode 重挂载应能安全清理并重新建立连接。
- `useMemo`/`useCallback` 处理有证据的昂贵计算或身份稳定需求，不作为每个函数的固定模板。传给长期 Provider/外部 store 的 options、subscribe/getSnapshot 应保持契约所需的稳定性。

这些边界与 [React 官方的 render 纯度](https://react.dev/reference/rules/components-and-hooks-must-be-pure)、[Effect 使用场景](https://react.dev/learn/you-might-not-need-an-effect)一致。

## 3. 状态和数据流

| 状态类别 | 默认所有者 | 注意事项 |
| --- | --- | --- |
| 局部交互状态 | 组件或最近的 feature Hook | 不因可抽象就提升为全局状态 |
| 可分享/可恢复的导航状态 | URL 路径与查询参数 | 在路由边界集中解析、校验和序列化 |
| 服务端快照 | feature 数据层/现有查询机制 | 明确缓存键、过期、刷新、取消和错误状态 |
| 复杂本地工作流 | feature store 或状态机 | 状态转移与命令有单一入口 |
| 跨 feature 全局状态 | app/core 明确所有者 | 仅主题、语言、会话等真正全局的能力 |
| 外部可订阅状态 | 稳定 store + React 订阅适配 | 快照不可变、订阅可取消；SSR 需一致初值 |

外部 store 用 `useSyncExternalStore` 或已有的封装接入，避免手写 effect 同步到第二份 React state。store 的 `getSnapshot` 在未变化时返回相同引用，`subscribe` 返回取消函数；需要服务端渲染时定义与首屏一致的 `getServerSnapshot`。这对应 [React 官方外部 store 契约](https://react.dev/reference/react/useSyncExternalStore)。

请求入口由 feature gateway 或现有数据获取框架拥有。页面不自行拼 URL、解析响应 envelope 或复制重试规则。DTO 不直接成为 UI 模型；形状/生命周期不同就显式映射。写操作通过用户事件触发，给出幂等与重复提交策略；取消、超时、竞态和“旧响应覆盖新筛选”的处理归数据层。显示组件不直接导入 `fetch`、数据库 SDK 或业务 gateway。

同步需要结果的协作使用函数/服务调用；已发生事实供独立消费者响应时才用类型化事件。事件定义 payload、发布时机、重复/顺序、失败隔离和取消订阅；父子数据流继续用 props/callback。不要用全局 event bus 取代普通调用，也不要把事件名写成散落的字符串。

## 4. 面向对象的合理位置

可用对象封装稳定协议、状态机、资源生命周期和可替换适配器；UI 仍使用函数组件。类要有清晰数据所有权、构造依赖、公开契约和释放方法。复杂逻辑先问是否是纯函数、Hook、服务对象或外部适配器，不因为原项目是 OOP 就添加基类。跨技术边界的可替换实现使用调用方所需的最小接口；一次性内部帮助函数不必虚构接口。

不得把 HTTP、规则判断、持久化、事件发送和页面渲染塞进同一类或 Hook。共享能力放到明确所有者，遵守依赖方向；对多实现行为做同一份契约测试。

## 5. 错误、权限、国际化和安全

- 数据层将网络/协议错误归一化为稳定错误类型；UI 将其映射为正式、可翻译的文案和恢复动作。日志与界面不暴露原始响应体、凭证或敏感堆栈。
- 客户端权限控制只负责导航和展示体验；服务端仍验证每次操作。未经授权、资源不存在、离线和加载失败是不同状态。
- 所有可见文案、字段标签、帮助、错误和 aria 名称进入翻译资源。协议键、枚举值与翻译键分别维护；日期、数字和时区由 locale-aware formatter 输出。
- 浏览器存储视为不可靠且可被用户读取。只存非敏感偏好，统一 key/schema/版本/过期/迁移；访问令牌、密钥、一次性凭证不进入 URL、localStorage、日志或分析事件。
- 可配置值按语义定义常量或配置对象；禁止为了省命名而散落魔法值。安全、重试、限流、超时和缓存策略需要具备可测试的默认值与上限。

## 6. 样式、性能与工程门禁

样式遵循[项目骨架规范的 SCSS 分层](REACT_PROJECT_SKELETON.md)。组件只消费语义 CSS token；局部选择器放 `*.module.scss`，全局重置/主题从唯一入口加载。第三方组件样式覆盖放专用 adapter，不能散落高权重选择器或 `!important`。

按路由或 feature 分包；大图表、编辑器与低频面板延后加载。大列表使用后端分页、窗口化或虚拟滚动，避免在 render 中重复做昂贵转换。性能优化先测量再引入缓存或 memo；同时核对首屏、交互延迟、资源清理和 bundle 变化。

每个 feature 的验证覆盖最关键的纯规则、协议映射、状态转移和用户路径。测试对可观察行为断言，不复写实现细节。代码门禁至少包含类型检查、lint（含 Hooks 规则）、构建和与改动相关的测试；页面改动追加键盘、空/错/加载、响应式与皮肤核对。不要把“能编译”称为交互验收。
