---
name: react-coding-standard
description: Apply the reusable React coding standard when implementing or reviewing React TypeScript application code, including file responsibilities, feature boundaries, state ownership, effects, API adapters, and tests. Not a project generator or visual-design skill.
---

# React Coding Standard

Use this skill for code changes or code review in an existing React application. Read the maintained [React coding standard](../../docs/REACT_CODING_STANDARD.md) completely before applying it. For directory placement or SCSS layering, read the relevant sections of the [project skeleton standard](../../docs/REACT_PROJECT_SKELETON.md). Project-specific instructions take precedence where they explicitly differ.

Assign each change to an owner before editing: `app` for assembly, `core` for once-per-app infrastructure, `shared` for genuinely reused business-neutral code, or `features/<feature>` for domain behavior. Separate wire DTO, gateway, pure policy, workflow, state subscription, and UI only when each has a real independent responsibility. Preserve existing behavior while moving code.

Follow idiomatic React: function components and Hooks for UI; objects for durable service/protocol ownership when warranted. Keep render pure, Effect cleanup explicit, public contracts documented, and UI text in locale resources. Do not import a Richie foundation package unless the target project has chosen it. Verify typecheck, Hooks lint, relevant tests, and build; report browser/runtime checks separately.
