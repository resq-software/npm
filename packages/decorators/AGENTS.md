# AGENTS.md — @resq-systems/decorators

TypeScript method and class decorators for caching, rate limiting, control flow, and observability. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/decorators build
bun --filter @resq-systems/decorators test
```

## What's here

- One folder per decorator: `memoize`, `memoize-async`, `throttle`, `throttle-async`, `debounce`, `delay`, `delegate`, `bind`, `readonly`, `observer`, `exec-time`, `before`, `after`, `execute`, `rate-limit`.
- `types.ts`, `_utils.ts`, `_assert.ts` — shared internals.
- Single entry point (`.`).

## Dependencies

- **Runtime:** none.
- **Peers:** none.

## Rules

- **Zero runtime deps.**
- Decorators must preserve the decorated member's signature — `type-preservation.test.ts` guards this. Run it after any type or signature change.
- Keep one decorator per folder; don't merge unrelated decorators into one module.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/decorators`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
