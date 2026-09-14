---
name: react-project-scaffold
description: Generate a new React TypeScript application from the reusable project skeleton with a safe script and maintained template. Use for new empty React projects, not for refactoring an existing app or designing its pages.
---

# React Project Scaffold

This skill creates a new product repository, not a feature inside an existing one. Read the bundled [skeleton contract](references/skeleton-contract.md) before choosing the profile. The supplied generator currently supports a client-side Vite SPA with React 19, TypeScript 6, strict types, Hooks lint, and SCSS light/dark skin. It does not generate SSR/Next.js, a router, API, a UI kit, or the Richie foundation package. If the requested platform differs, do not mislabel this SPA template as a match.

The generator is [scripts/create_react_project.py](scripts/create_react_project.py); its source template is [assets/react-spa](assets/react-spa). Resolve both paths from this `SKILL.md` directory so the skill works when installed independently of the repository. Inspect the exact destination first. The parent directory must exist and the destination must not exist. Run a preview, then generate:

```bash
python3 /path/to/react-project-scaffold/scripts/create_react_project.py --name my-react-app --output /absolute/path/my-react-app --dry-run
python3 /path/to/react-project-scaffold/scripts/create_react_project.py --name my-react-app --output /absolute/path/my-react-app
```

The script never overwrites an existing target, installs dependencies, initializes Git, or publishes anything. Obtain authorization for the target path and for any later Git/network operation independently. After generation, run `npm install`, `npm run typecheck`, `npm run lint`, and `npm run build` when the environment permits. Report generator success separately from dependency-install/build or browser validation. Add business-specific layers only as real workflows emerge; do not fill the skeleton with placeholder directories.
