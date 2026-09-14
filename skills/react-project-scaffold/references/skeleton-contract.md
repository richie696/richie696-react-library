# React SPA 骨架契约

本 Skill 的 Vite SPA profile 只生成可运行的最小 React 19 + TypeScript 6 工程，不预设业务、路由器、UI 组件库、服务端协议或 Richie 底座依赖。SSR、Next.js 和 React Native 需要独立 profile，不能复用 DOM 挂载入口。

## 目录所有权

- `src/main.tsx` 只负责挂载与唯一全局样式入口。
- `src/app` 只负责 Provider、应用壳和未来路由的装配，不持有业务规则。
- `src/core` 持有一次性的全应用基础设施、翻译资源和 SCSS 皮肤。
- `src/features/<name>` 按业务能力纵向组织；页面、API、model、workflow、state 按真实职责出现时再创建。
- `src/shared` 仅在第二个真实消费者出现后创建；不能把无所有者代码放进万能 `utils.ts`。

依赖方向为 `app → features / shared / core`、`features → shared / core`、`shared → core`。feature 不深层导入另一个 feature 的私有文件。新工程仅含中性的 HomePage 示例，不预建空目录。

## 皮肤与质量门禁

`core/styles/index.scss` 是唯一全局入口；`themes/` 给语义 CSS token 赋值，`tokens/` 定义非品牌结构值，组件同目录的 `*.module.scss` 只消费 token。浅/深色都要可读，键盘焦点和减少动效不能因主题切换丢失。可见文案与协议字段分离。

生成器不得覆盖已有目标，也不得自行安装依赖、初始化 Git 或发布。生成后由目标工程建立自己的 lockfile，再执行类型检查、Hooks lint 和构建；这些检查不能代替浏览器交互验收。
