# AGENTS.md — @resq-systems/http

Effect-based HTTP client with retry, timeout, and schema validation. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/http build
bun --filter @resq-systems/http test
```

## What's here

- `fetcher.ts` — the Effect-based HTTP client (retry, timeout, schema validation).
- `security.ts` — security helpers (entry `./security`).
- Core barrel (entry `.`).

## Dependencies

- **Runtime:** `@resq-systems/types`.
- **Peers:** `effect`, `@effect/platform-bun`.

## Rules

- Built on Effect — I/O returns `Effect` values, not raw Promises. `effect` and `@effect/platform-bun` are **peers**.
- Responses are schema-validated; add a schema rather than trusting the response shape.
- Security helpers live behind `./security`.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/http`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
