# AGENTS.md — @resq-systems/ui

ResQ Systems shared UI component library — a shadcn-based design system (Radix + base-ui + Tailwind v4). Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/ui build
bun --filter @resq-systems/ui test
bun --filter @resq-systems/ui lint            # Biome
bun --filter @resq-systems/ui storybook       # Storybook dev server
bun --filter @resq-systems/ui chromatic       # visual regression
```

## What's here

- `components/` — one file per component, each with its own subpath export (`./button`, `./card`, …).
- `hooks/` — shared hooks.
- `lib/` — utilities (e.g. `cn`).
- `styles/` — Tailwind v4 theme and tokens.

## Dependencies

- **Runtime:** `radix-ui`, `@base-ui/react`, `@phosphor-icons/react`, `recharts`, `cmdk`, `class-variance-authority`, `clsx`, `tailwind-merge`, `next-themes`, and more.
- **Peers:** `react`, `react-dom`, `tailwindcss`.

## Rules

- **Dark-first oklch color system** with WCAG AA contrast — use theme tokens, don't hardcode colors.
- `console-fail-test` is active: any `console.log/warn/error` inside a test **fails** it.
- Every component is individually exported (tree-shakeable subpaths).
- Radix / base-ui own interaction logic; Tailwind v4 owns styling.
- Visual review runs through Storybook + Chromatic. Lint with Biome (`lint`), dead-code with `lint:knip`. Run `copyright` to apply license headers.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/ui`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
