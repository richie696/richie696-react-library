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
- No runtime dependency in the core package

## Development

```bash
npm install
npm run typecheck
npm test
```

This is the initial foundation slice. UI component adapters, router adapters and
application-specific gateways will remain separate packages so the core stays portable.
