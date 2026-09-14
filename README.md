# richie696-react-library

React 19 foundation libraries for Richie696 applications.

The repository deliberately separates a framework-neutral core from React bindings:

```text
@richie696/react-framework       # fetch, URL, errors, events, storage, SSE, identity
@richie696/react-framework-react # React 19 provider and hooks
```

The core package has no React or UI-library dependency. Applications can use it with
React DOM, React Native, Next.js, Remix, or another renderer. React bindings expose
idiomatic hooks and providers instead of Angular-style base classes.

## Current baseline

- React `19.3.x`
- TypeScript `6.x`
- ESM packages with strict declarations
- Native `fetch`, `AbortController`, Web Crypto and browser storage APIs
- RxJS is an internal runtime dependency of the core reactive services; it is not
  exposed in the public event/store contracts

## Development

```bash
npm install
npm run typecheck
npm test
```

The core also contains framework-neutral reactive services for application state and live data:

- `StateStore` and `ReadonlyStore` provide immutable external-store snapshots.
- `ObservableResource` models one cancellable async resource with idle/loading/
  success/error states and stale-result protection.
- `PollingStore` provides bounded polling with timeout, retry and no-overlap
  semantics; `TimeSeriesStore` keeps a bounded chart window.
- The React package maps these contracts to `useSyncExternalStore`,
  `useObservableResource`, `useOnlineStatus` and typed `useEvent` hooks.

UI component adapters, router adapters and application-specific gateways remain
separate packages so the core stays portable.

Reusable React application standards are organized under [React 工程规范](docs/REACT_ENGINEERING_STANDARD.md):

- [UI/UE 设计](docs/REACT_UI_UX_STANDARD.md)
- [编码规范](docs/REACT_CODING_STANDARD.md)
- [项目骨架与 SCSS 皮肤](docs/REACT_PROJECT_SKELETON.md)

For a new minimal Vite SPA, preview and generate the maintained skeleton:

```bash
python3 skills/react-project-scaffold/scripts/create_react_project.py --name my-react-app --output /absolute/path/my-react-app --dry-run
python3 skills/react-project-scaffold/scripts/create_react_project.py --name my-react-app --output /absolute/path/my-react-app
```

Versioned Codex skills [react-coding-standard](skills/react-coding-standard/SKILL.md)
and [react-project-scaffold](skills/react-project-scaffold/SKILL.md) apply these
standards to existing code and new-project generation respectively. Install them
under your personal Codex skills directory to make them discoverable across projects.

The separate [foundation API guide](docs/RICHIE_FOUNDATION_USAGE.md) maps this
repository's published APIs to application responsibilities. Product-specific
flows and visual values belong in each consuming application.
