# ResQ npm Packages — Agent Guide

## Mission

Registry workspace for all ResQ npm packages published under the `@resq-sw` scope. Contains the shared UI component library and standalone DSA utilities.

## Stack

- **Runtime:** Bun 1.x
- **Language:** TypeScript (strict mode)
- **Testing:** Vitest
- **Build:** tsc (dsa), tsdown (ui)
- **Linting:** Biome
- **Visual Testing:** Chromatic (ui only)

## Repo Map

- `packages/ui/` — `@resq-sw/ui`: React component library (Radix + Tailwind)
- `packages/dsa/` — `@resq-sw/dsa`: Data structures and algorithms (zero deps)

## Commands

```bash
bun install                      # Install all workspace dependencies
bun test                         # Run all workspace tests
bun --filter @resq-sw/dsa test   # Test DSA package only
bun --filter @resq-sw/ui test    # Test UI package only
bun --filter @resq-sw/dsa build  # Build DSA package
bun --filter @resq-sw/ui build   # Build UI package
bun --filter @resq-sw/ui storybook  # Start Storybook dev server
bun --filter @resq-sw/ui lint    # Lint UI package with Biome
```

## Rules

- `@resq-sw/dsa` must have zero runtime dependencies (Effect is a peer dep for optional schemas only).
- `@resq-sw/ui` uses Radix UI for interaction logic and Tailwind CSS v4 for styling.
- All packages must be tree-shakeable.
- Zero `any` — strict typing throughout.
- Each package has its own build and test scripts.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- Package manager is **bun** — do not use npm, yarn, or pnpm.

## Safety

- Don't add runtime dependencies to `@resq-sw/dsa` — it must stay zero-dep.
- Don't publish without running the full test suite (`bun test`).
- Lockfile (`bun.lock`) must be committed with dependency changes.
- Don't commit secrets, private keys, or `.env` files.
- `console-fail-test` is active in UI tests: any `console.log/warn/error` call inside a test causes failure.

## Workflow

1. Run `bun install` from workspace root after dependency changes.
2. Make changes in the relevant `packages/` directory.
3. Run `bun test` before finalizing.
4. Each package builds independently (`bun --filter <pkg> build`).
5. Summarize: files changed, behavior change, tests run.

## References

- [UI Package README](packages/ui/README.md)
- [DSA Package](packages/dsa/)
- [Contributing Guide](.github/CONTRIBUTING.md)
- [Development Guide](.github/DEVELOPMENT.md)
