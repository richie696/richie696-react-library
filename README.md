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

The core also contains framework-neutral reactive services for dashboard work:

- `StateStore` and `ReadonlyStore` provide immutable external-store snapshots.
- `ObservableResource` models one cancellable async resource with idle/loading/
  success/error states and stale-result protection.
- `PollingStore` provides bounded polling with timeout, retry and no-overlap
  semantics; `TimeSeriesStore` keeps a bounded chart window.
- The React package maps these contracts to `useSyncExternalStore`,
  `useObservableResource`, `useOnlineStatus` and typed `useEvent` hooks.

UI component adapters, router adapters and application-specific gateways remain
separate packages so the core stays portable.
