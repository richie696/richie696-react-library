# Richie React 工程约束

Before changing public APIs or application architecture, read [React 工程职责与皮肤规范](docs/REACT_ENGINEERING_STANDARD.md) and the relevant package exports. Apply the `modern-react-ui-design` skill for React application structure, data/state ownership and SCSS skin work.

- `packages/framework` stays React, router, DOM and UI-library independent. It owns reusable protocol and lifecycle mechanics, not product rules or colors.
- `packages/react` only adapts framework contracts to React Providers and Hooks. Product-specific behavior belongs in the consumer application.
- Preserve public imports and semantic contracts when reorganizing files; update JSDoc, tests and architecture docs for public changes.
- Keep data ownership, lifecycle, cleanup and stable Provider options explicit. Do not introduce base-component inheritance or feature-specific events into the generic core by convenience.
- Application skins are product-owned. Extract a separate optional style package only after real multi-product reuse is demonstrated.
