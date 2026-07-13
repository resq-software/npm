# AGENTS.md — @resq-systems/rate-limiting

Rate limiting algorithms (token bucket, leaky bucket, sliding window), throttle/debounce utilities, and HTTP middleware. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/rate-limiting build
bun --filter @resq-systems/rate-limiting test
```

## What's here

- `rate-limit.ts` — the limiter algorithms.
- `decision.ts` — limit decision types/results.
- `throttle.ts` — throttle/debounce utilities.
- Single entry point (`.`).

## Dependencies

- **Runtime:** `@resq-systems/dsa`, `@resq-systems/types`.
- **Peers:** `effect`, `@upstash/redis`, `@upstash/ratelimit`.

## Rules

- In-memory limiters build on `@resq-systems/dsa` — reuse its structures rather than reimplementing.
- Distributed limiting via Upstash Redis is optional — `@upstash/*` and `effect` are **peers**; keep them out of the default import path.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/rate-limiting`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
