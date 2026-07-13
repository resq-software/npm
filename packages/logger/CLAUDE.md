# AGENTS.md — @resq-systems/logger

Structured logging with log levels for Node.js and Bun. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/logger build
bun --filter @resq-systems/logger test
```

## What's here

- `logger.ts` / `logger.types.ts` — core logger and types.
- `logger.decorators.ts` — logging decorators.
- `transports.ts` — pluggable output transports.
- Single entry point (`.`).

## Dependencies

- **Runtime:** none.
- **Peers:** none.

## Rules

- **Zero runtime deps.**
- Runs on both Node.js and Bun — guard any runtime-specific API.
- `@resq-systems/helpers` depends on this package; keep the public surface stable.
- Transports are pluggable; add a transport rather than special-casing output in the core.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/logger`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
