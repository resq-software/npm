# AGENTS.md — @resq-systems/helpers

Functional utilities, type guards, result types, performance measurement, and async task execution. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/helpers build
bun --filter @resq-systems/helpers test
```

## What's here

- `helpers.ts` — core utilities, type guards, result types (entry `.`).
- `task-exec.ts` / `task-exec.types.ts` — async task execution.
- `parse-code-path.ts` — code-path parsing.
- `formatting/` — formatting helpers (entry `./formatting`).
- `browser/` — browser-only utilities (entry `./browser`).

## Dependencies

- **Runtime:** `@resq-systems/dsa`, `@resq-systems/logger`, `@resq-systems/types`.
- **Peers:** none.

## Rules

- Keep the core (`.`) safe for Node and Bun. Anything that touches `window`/DOM belongs under `./browser`.
- Formatting helpers live behind `./formatting` to stay tree-shakeable.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/helpers`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
