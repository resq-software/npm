# ResQ npm Packages — Agent Guide

@./AGENTS.md

## Stack

- **Runtime:** Bun 1.x
- **Language:** TypeScript (strict mode)
- **Testing:** Vitest
- **Build:** tsdown (all packages)
- **Linting:** Biome
- **Versioning:** Changesets
- **Visual Testing:** Chromatic (ui only)

## Commands

```bash
bun install                      # Install all workspace dependencies
bun test                         # Run all workspace tests
bun run build                    # Build all packages
bun --filter @resq-sw/<pkg> test # Test single package
bun --filter @resq-sw/<pkg> build # Build single package
bun --filter @resq-sw/ui storybook  # Start Storybook dev server
bun --filter @resq-sw/ui lint    # Lint UI package with Biome
bun changeset                    # Create a changeset for your changes
```

## Rules

- `@resq-sw/dsa` must have zero runtime dependencies (Effect is a peer dep for optional schemas only).
- `@resq-sw/ui` uses Radix UI for interaction logic and Tailwind CSS v4 for styling.
- All packages must be tree-shakeable.
- Zero `any` — strict typing throughout.
- Each package has its own build and test scripts.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- Package manager is **bun** — do not use npm, yarn, or pnpm.
- Use `bun changeset` to describe changes for versioning. CI handles the rest.

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
4. Create a changeset (see below).
5. Each package builds independently (`bun --filter <pkg> build`).
6. Summarize: files changed, behavior change, tests run.

## Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation. **Every PR that changes package behavior must include a changeset.**

### When to create a changeset

- **Yes:** New features, bug fixes, performance improvements, refactors that change public API, dependency changes that affect consumers.
- **No:** Documentation-only changes, test-only changes, CI/tooling changes, internal refactors with no public API change.

### How to create a changeset

Since `bun changeset` is interactive and cannot be used by agents, create the file directly:

1. Generate a random kebab-case name (e.g., `brave-dogs-swim`, `quick-foxes-jump`).
2. Write the file to `.changeset/<name>.md` with this format:

```md
---
"@resq-sw/dsa": minor
"@resq-sw/helpers": patch
---

Add LRU cache data structure with configurable capacity
```

### Bump type rules

- `patch` — Bug fix, internal refactor with no API change, dependency update.
- `minor` — New feature, new export, new option on existing API.
- `major` — Breaking change: removed export, renamed function, changed return type, changed required params.

### Multi-package changes

- List every affected package in the frontmatter.
- When a dependency package changes, bump its dependents as `patch` (changesets handles this automatically via `updateInternalDependencies: "patch"` in config, but be explicit when the dependent's public behavior also changes).

### Description format

- One line, present tense, no period at end.
- Start with a verb: "Add ...", "Fix ...", "Remove ...", "Update ...".
- Reference the specific thing that changed, not the file.

### Examples

```md
---
"@resq-sw/ui": minor
---

Add Combobox component with keyboard navigation and filtering
```

```md
---
"@resq-sw/dsa": patch
---

Fix Graph.dijkstra returning incorrect path when source equals target
```

```md
---
"@resq-sw/security": minor
"@resq-sw/http": patch
---

Add HTTPS redirect utility and move it from rate-limiting to http package
```

### What CI does

On push to `master`, the changesets GitHub Action:
1. If pending changesets exist: creates/updates a **"Version Packages"** PR with bumped versions and updated CHANGELOGs.
2. If that PR is merged: publishes all bumped packages to npm.

You do not need to manually bump versions, edit CHANGELOGs, or run `npm publish`.

## References

- [Architecture & Package Table](AGENTS.md)
- [Style Guide](design/STYLE_GUIDE.md)
- [Contributing Guide](.github/CONTRIBUTING.md)
- [Development Guide](.github/DEVELOPMENT.md)
