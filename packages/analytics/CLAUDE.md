# AGENTS.md — @resq-systems/analytics

Unified PostHog + GA4 analytics client — cross-subdomain, lazy-loaded, with typed events. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/analytics build
bun --filter @resq-systems/analytics test
```

## What's here

- `resq.ts` — the ResQ-configured client and typed event definitions.
- `index.ts` — framework-agnostic core (entry `.`).
- `react/` — React bindings and hooks (entry `./react`).
- `next/` — Next.js integration (entry `./next`).

## Dependencies

- **Runtime:** `@resq-systems/types`.
- **Peers:** `posthog-js`, `react`, `react-dom`.

## Rules

- Keep the core (`.`) framework-agnostic. React and Next.js code lives behind `./react` and `./next` so non-React consumers pull in nothing extra.
- `posthog-js`, `react`, and `react-dom` are **peers** — never bundle them.
- Analytics loads lazily; preserve that behavior when adding providers.
- Events are typed — extend the event map rather than firing free-form strings.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/analytics`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
