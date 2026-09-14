# Richie React 工程约束

Before changing public APIs or application architecture, read the [React 工程规范索引](docs/REACT_ENGINEERING_STANDARD.md) and the relevant generic UI/UE, coding or project-skeleton document. For this repository's published APIs, also read [底座 API 使用指南](docs/RICHIE_FOUNDATION_USAGE.md) and verify the actual package exports. Apply `react-coding-standard` for application code boundaries, `react-project-scaffold` for new-project generation, and `modern-react-ui-design` for page UI/UE and SCSS skin work.

- `packages/framework` stays React, router, DOM and UI-library independent. It owns reusable protocol and lifecycle mechanics, not product rules or colors.
- `packages/react` only adapts framework contracts to React Providers and Hooks. Product-specific behavior belongs in the consumer application.
- Preserve public imports and semantic contracts when reorganizing files; update JSDoc, tests and architecture docs for public changes.
- Keep data ownership, lifecycle, cleanup and stable Provider options explicit. Do not introduce base-component inheritance or feature-specific events into the generic core by convenience.
- Application skins are product-owned. Extract a separate optional style package only after real multi-product reuse is demonstrated.
