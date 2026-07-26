# AGENTS.md — @resq-systems/telemetry

Framework-agnostic real-time telemetry client — a single-owner reconnecting WebSocket with exponential backoff, many-consumer fan-out, and open-replay, plus React bindings. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/telemetry build
bun --filter @resq-systems/telemetry test
```

## What's here

- `src/socket.ts` — `TelemetrySocket`: owns one WebSocket, `subscribe`/`send`, reconnect + open-replay.
- `src/backoff.ts` — `createBackoff` + `createReconnectTimer` (pure schedule + single-timer).
- `src/types.ts` — `WebSocketLike`, `ConnectionState`, `TelemetrySubscription`.
- `src/react/` — `TelemetryProvider` + `useTelemetry` / `useTelemetryChannel` (entry `./react`).

## Dependencies

- **Runtime:** none.
- **Peers:** `react` (optional — only for `./react`).

## Rules

- Keep the core (`.`) framework-agnostic. React code lives behind `./react` so non-React consumers pull in nothing extra.
- `react` is an **optional peer** — never bundle it.
- No runtime dependencies. The socket uses the global `WebSocket` by default and accepts an injected factory for Node / tests.
- One provider owns one socket; consumers multiplex channels over it (mirrors the fleet dashboard's `/fleet/ws` owner).

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/telemetry`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
