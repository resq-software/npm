# Development

After [forking the repo from GitHub](https://help.github.com/articles/fork-a-repo):

```shell
git clone https://github.com/(your-name-here)/ui
cd ui
bun install
```

> This repository includes a list of suggested VS Code extensions.
> It's a good idea to use [VS Code](https://code.visualstudio.com) and accept its suggestion to install them, as they'll help with development.

Alternatively, use **Nix** for a fully reproducible environment:

```shell
nix develop
```

## Building

Run [**tsdown**](https://tsdown.dev) locally to build source files from `src/` into output files in `lib/`:

```shell
bun build
```

Run in watch mode for continuous rebuilds:

```shell
bun dev
```

## Formatting

[Biome](https://biomejs.dev) is used for formatting and linting.
It runs automatically on staged files via a Husky pre-commit hook.

To manually format all files:

```shell
bun format
```

## Linting

Several linting tools are configured:

- `bun lint` ([Biome](https://biomejs.dev)): Lints and formats JavaScript/TypeScript source files
- `bun lint:knip` ([knip](https://github.com/webpro/knip)): Detects unused files, dependencies, and code exports
- `bun lint:spelling` ([cspell](https://cspell.org)): Spell checks across all source files

## Testing

[Vitest](https://vitest.dev) is used for tests:

```shell
bun test
```

With coverage:

```shell
bun test --coverage
```

> [console-fail-test](https://github.com/JoshuaKGoldberg/console-fail-test) is enabled for all test runs. Calls to `console.log`, `console.warn`, and other console methods will cause a test to fail.

### Test categories

- **Unit tests** (`*.test.ts`) — component styling and behavior
- **Performance regression tests** (`*.perf.test.ts`) — GPU-friendly transitions, DOM budgets, data-slot tracking
- **Source-level guards** (`perf-guards.test.ts`, `quality-guards.test.ts`) — scan all component files for anti-patterns
- **Export surface** (`export-surface.test.ts`) — snapshot of public API to catch accidental removals

### Debugging Tests

This repository includes a [VS Code launch configuration](https://code.visualstudio.com/docs/editor/debugging) for debugging unit tests.
To launch it, open a test file, then run _Debug Current Test File_ from the VS Code Debug panel (or press F5).

## Storybook

Preview components locally:

```shell
bun storybook
```

Build a static Storybook:

```shell
bun build-storybook
```

The Storybook UI uses the ResQ dark theme by default with a toolbar toggle for light mode.

## Type Checking

```shell
bun tsc
```

Add `--watch` for continuous type checking:

```shell
bun tsc --watch
```
