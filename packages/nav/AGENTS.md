# AGENTS.md — @resq-systems/nav

Earth and vehicle geometry, collision geometry, and derived navigation quantities for telemetry consoles. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/nav build
bun --filter @resq-systems/nav test
```

## What's here

- `geo.ts` — great-circle distance and bearing, the local ENU frame, bearing normalisation, position validation.
- `approach.ts` — CPA/TCPA as planar geometry, decoupled from any message format.
- `arpa.ts` — contact risk ordering. Policy, not rendering.
- `derived.ts` — crab angle, set and drift, slip ratio, stopping distance, endurance.
- `units.ts` — knots, m/s, nautical miles, degrees, radians.
- `numeric.ts` / `staleness.ts` — finite-number narrowing and reading freshness.
- Tests are colocated (`src/**/*.test.ts`), which is what made the move out of `ui` byte-for-byte.

## Dependencies

- **Runtime:** none.
- **Peers:** none.

## Rules

- **Zero runtime deps.** This package is a leaf so that `ui`, `map`, a worker and a server can all reach it.
- **Refusal over guessing.** A function given an unanswerable input returns `null`/`undefined`. Never substitute a default to make a caller simpler — a plausible number with no basis is worse than a visibly absent one.
- **Admission test for any new formula** — all three must hold: (1) every input is a quantity the telemetry carries or the caller declares; (2) the output is a description, not a command; (3) it can honestly refuse. See the README for what this permanently excludes.
- No React, no DOM, no transport, no protocol decoding. Protocol adapters stay in `@resq-systems/ui/adapters`.
- Document units in JSDoc on every numeric parameter and return. Units errors are the failure mode here.
- `@resq-systems/ui` and `@resq-systems/map` depend on this package; keep the public surface stable.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/nav`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Derived Navigation Math — Architecture](../../design/VEHICLE_NAVIGATION_MATH.md)
- [Workspace guide](../../AGENTS.md)
