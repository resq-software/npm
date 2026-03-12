# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@resq/ui` is a shared UI component library for the ResQ platform — a shadcn-based design system built on Radix UI primitives, Tailwind CSS v4, and `class-variance-authority` for variant management.

## Commands

```sh
pnpm build           # Build src/ → lib/ using tsdown
pnpm dev             # Build in watch mode
pnpm test            # Run Vitest tests
pnpm tsc             # Type-check without emitting
pnpm lint            # ESLint (run pnpm build first)
pnpm lint:knip       # Detect unused files/exports
pnpm lint:spelling   # cspell spell check
pnpm format --write  # Auto-format with Prettier
pnpm storybook       # Start Storybook on port 6006
pnpm build-storybook # Build Storybook static output
```

Run a single test file:

```sh
pnpm test src/components/button/button.test.tsx
```

Run tests with coverage:

```sh
pnpm test --coverage
```

**Important:** `pnpm build` must run before `pnpm lint` — some lint rules inspect built files.

## Architecture

### Component structure

Each component lives in `src/components/<name>/` with two files:

- `<name>.tsx` — the component implementation
- `index.ts` — re-exports everything from the `.tsx` file

Every component is individually exported via the `exports` map in `package.json` (e.g., `@resq/ui/button`) and also aggregated in `src/index.ts`.

### Component conventions

- Use `class-variance-authority` (`cva`) for variant definitions; export the variants object alongside the component.
- Use `radix-ui`'s `Slot.Root` for the `asChild` pattern.
- Apply `data-slot="<component-name>"` to root elements for CSS targeting.
- Use `cn()` from `src/lib/utils.ts` (wraps clsx + tailwind-merge) for className merging.
- Accept `React.ComponentProps<"element">` spread to stay composable.
- Components are plain functions (not arrow functions), e.g. `function Button(...)`.

### Styling

- Tailwind CSS v4 — config is entirely in `src/styles/globals.css` via `@import "tailwindcss"`.
- Design tokens are CSS custom properties on `:root` and `.dark` using the `oklch` color space.
- Dark mode via the `.dark` class variant: `@custom-variant dark (&:is(.dark *))`.
- `tw-animate-css` provides animation utilities.

### Exports

- **Main barrel:** `src/index.ts` re-exports all components plus `useIsMobile` and `cn`.
- **Per-component:** each directory's `index.ts` is the per-path export entry.
- **CSS:** `src/styles/globals.css` is exported as `@resq/ui/styles/globals.css` and must be imported by consumers.

### File headers

All source files carry an Apache-2.0 license header (see existing files for format). New files should include it.

### Testing

- Vitest, configured in `vitest.config.ts`.
- `console-fail-test` is active: any `console.log/warn/error` call inside a test causes a failure — use mocks or suppress intentionally.
- Stories (`.stories.tsx`) use Storybook 8 with `@storybook/react`.

### Tooling notes

- Package manager: **pnpm** — do not use npm or yarn.
- Pre-commit hook (Husky + lint-staged): auto-formats all staged files with Prettier.
- `knip` tracks unused exports — remove dead code rather than suppressing.
- `perfectionist` ESLint plugin enforces natural sort order on imports and object keys.
