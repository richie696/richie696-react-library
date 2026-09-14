# React 项目骨架与文件职责规范

这是产品工程的推荐骨架，不绑定 Vite、Next.js、React Router、TanStack Router、Material、Ant Design 或 `@richie696/*`。选择构建器/路由器后保留职责边界即可。只创建当前功能需要的目录；一个小产品不需要把示例树中的所有文件提前建空。

## 1. 顶层结构

```text
project/
├── public/                       # 不经打包处理的公开静态资源
├── src/
│   ├── main.tsx                  # 客户端挂载入口；SSR 框架可替换为其约定入口
│   ├── app/                      # 应用装配和路由出口
│   ├── core/                     # 全应用一次性基础设施
│   ├── shared/                   # 多 feature 复用且不含业务所有权的能力
│   └── features/                 # 按业务能力纵向组织
├── tests/                        # 跨 feature / 浏览器级测试
├── package.json                  # 依赖与固定的校验命令
├── tsconfig.json                 # 严格类型配置
└── <tool-configs>                # 构建、lint、测试、格式化配置
```

`public` 不存私钥和运行时秘密。根入口只装配，不能承担领域规则。测试与构建配置由所选工具提供；骨架规范不强迫引入特定库。

## 2. `src` 的目标形态

```text
src/
├── app/
│   ├── App.tsx                   # Provider、路由与应用壳的组合
│   ├── providers/
│   │   └── AppProviders.tsx      # 根服务/主题/i18n/query Provider 装配
│   ├── router/
│   │   ├── routes.tsx            # 路由表与 feature lazy import
│   │   └── route-params.ts       # 路径/查询参数解析与序列化
│   └── shell/
│       ├── AppShell.tsx          # 导航、顶栏、主区与全局反馈容器
│       └── AppShell.module.scss # 壳层局部样式
├── core/
│   ├── api/                      # 全局 HTTP 配置、错误与鉴权协议适配
│   ├── config/                   # 已验证的运行时配置/能力开关
│   ├── i18n/                     # locale 注册、全局文案、格式化器
│   ├── session/                  # 会话上下文与清理策略
│   ├── telemetry/                # 脱敏日志、追踪和指标适配
│   └── styles/
│       ├── index.scss           # 唯一全局样式入口
│       ├── _reset.scss          # 基线 reset 与全局可访问性样式
│       ├── themes/
│       │   ├── _light.scss       # 浅色 token 值
│       │   └── _dark.scss        # 深色 token 值
│       ├── tokens/
│       │   ├── _structure.scss   # spacing、type、radius、motion、layout
│       │   └── _mixins.scss      # 少量参数化 SCSS 复用
│       └── patterns/             # 真正跨 feature 的全局模式
├── shared/
│   ├── ui/                       # 通用组件及其 CSS Modules
│   ├── hooks/                    # 业务中性、生命周期安全的组合 Hook
│   ├── format/                   # 纯时间/数字/文本格式化
│   ├── types/                    # 多 feature 使用的稳定契约
│   └── assets/                   # 多 feature 共享的产品资产
└── features/
    └── <feature>/
        ├── api/                  # endpoint、DTO、gateway
        ├── model/                # 领域类型、纯规则、映射与校验
        ├── application/          # 用例/工作流编排
        ├── state/                # feature store 与 UI 订阅 Hook
        ├── ui/                   # 路由页面、私有组件、局部 SCSS
        ├── i18n/                 # feature 文案
        ├── fixtures/             # 显式测试/演示数据；生产代码不导入
        ├── tests/                # feature 契约和交互测试
        └── index.ts              # 必要时才导出稳定公共契约
```

依赖关系是 `app → features / shared / core`、`features → shared / core`、`shared → core`、`core → 第三方基础能力`。`core` 不导入 `shared`/`features`，`shared` 不导入 `features`。一个 feature 不深层导入另一个 feature；确需协作时使用显式导出的最小契约、应用编排或事件，而不是互相读取内部 store。

在 feature 内，常见方向是 `ui → state/application → api/model → core`。`model` 尽量保持纯粹，不依赖 React、DOM 或网络。`api` 可以把 DTO 映射为 model，但不能反过来让 model 引用 wire DTO。`application` 组合调用并决定工作流；`ui` 展示状态并触发命令。

## 3. 逐文件职责与禁止混放

| 文件类别 | 输入与输出 | 不应承担 |
| --- | --- | --- |
| `main.tsx` | 根 DOM/框架挂载与唯一全局样式导入 | 路由决策、业务数据加载 |
| `App.tsx` | Provider、Router、Shell 的组合 | 页面 JSX 大全集、HTTP、领域判断 |
| `AppProviders.tsx` | 稳定服务实例/options，明确释放边界 | 依据某个页面临时状态重建根服务 |
| `routes.tsx` | 路径→页面、lazy 边界、路由级错误/权限适配 | API 路径、领域计算 |
| `AppShell.tsx` | 全局导航、布局和反馈容器 | 某个 feature 的内部流程 |
| `core/api/*` | 全局请求配置、身份/错误/日志横切适配 | 某个 feature 的 endpoint 与 DTO |
| `*.endpoints.ts` | 不可变 endpoint/方法/参数元数据 | 发请求、解析 JSON |
| `*.dto.ts` | 可序列化线上字段与版本 | 用户文案、组件 props |
| `*.gateway.ts` | 发请求、解析响应、映射错误与 DTO | 表单交互、导航、主题 |
| `*.policy.ts` / `*.validation.ts` | 纯规则、校验结果与决策 | 网络、DOM、toast |
| `*.mapper.ts` | 明确的 DTO、领域、视图转换 | 隐式请求或状态更新 |
| `*.workflow.ts` | 用例顺序、冲突/取消/幂等边界 | JSX 和 CSS |
| `*.store.ts` | feature 快照、状态转移和命令 | 大量展示格式和 DOM 操作 |
| `use*.ts` | React 状态订阅、事件绑定、清理 | 协议解析、全局服务定位 |
| `*Page.tsx` | 路由容器、页面区块组合、导航命令 | 服务端 DTO 转换、重复复杂规则 |
| 其它 `*.tsx` | 单个组件的语义结构、局部交互 | 隐藏的跨 feature 写入 |
| `*.module.scss` | 本组件选择器，消费设计 token | `:root` 色值、其它 feature 选择器 |
| `index.ts` | 经确认的公共入口 | `export *` 暴露整个私有目录 |

文件名要让读者猜到职责：`ItemTable.tsx`、`useItemSelection.ts`、`item.gateway.ts`。不要把各种无关函数塞进 `utils.ts`。页面存在一个小型内部子组件时可同文件；出现独立状态、复用、样式或不同变化原因时再拆出。

## 4. SCSS 皮肤文件的真实职责

`core/styles/index.scss` 是唯一全局入口，负责按顺序加载主题赋值、结构 token、reset 和少量跨 feature 模式。组件仅 import 自己的 `*.module.scss`。可用形态：

```scss
// core/styles/index.scss
@use './themes/light';
@use './themes/dark';
@use './tokens/structure';
@use './reset';
```

```scss
// core/styles/themes/_light.scss
:root,
html[data-theme='light'] {
  --color-background: #f6f8fb;
  --color-surface: #ffffff;
  --color-text: #18212b;
  --color-text-muted: #536171;
  --color-border: #d9e0e8;
  --color-focus: #1769c2;
}

// core/styles/themes/_dark.scss
html[data-theme='dark'] {
  --color-background: #111b24;
  --color-surface: #1b2a36;
  --color-text: #edf3f8;
  --color-text-muted: #a9bbc9;
  --color-border: #354b5a;
  --color-focus: #7cbcff;
}
```

示例色值仅展示 token 位置，不能作为产品默认品牌。正式皮肤需覆盖状态色、交互层级、图表轴/线/网格/tooltip 等同名 token；浅/深色都必须保持可读性。`tokens/_structure.scss` 只定义非品牌的间距、排版、圆角、动效与布局变量；SCSS mixin 只用于需要参数化的重复结构。组件不直接 `@use` 某个具体主题文件。

首屏由服务端标记或挂载前的小型初始化设置 `data-theme`，避免 React 挂载后闪烁；主题切换只改变 token 值。JS 图表库通过集中 theme adapter 读取同一组 CSS token，切换时统一刷新；不在每个图表复制十几种色值。`prefers-reduced-motion`、高对比、文本放大和 CSS viewport/container 重排是皮肤验收的一部分。若使用 Sass，依赖归产品构建层；无样式需求的底层协议库不引入 Sass。

## 5. 两种项目尺度

- 小型应用可从 `app` + 一两个 `features` + `core/styles` 开始；`shared` 在第二个真实消费者出现后再建。不要因骨架示例而创建空的 `application`、`store` 或 `telemetry`。
- 大型应用沿业务能力纵向扩展，每个 feature 的公开面保持最小。路由级代码分割与数据加载按所选框架处理；SSR/React Native 用其平台入口替代 DOM 专属文件，并为浏览器 API 提供明确适配。

新增 feature 时先确定数据/规则所有者，再决定需要的文件，随后定义入口和测试。搬迁旧代码时一次处理一个可验收的用户路径，保留行为、URL 和皮肤；迁走的全局 CSS 规则要同步删除，避免新旧样式长期重叠。
