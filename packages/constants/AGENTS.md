# AGENTS.md — @resq-systems/constants

Shared, zero-dependency constants: design tokens (oklch + email-safe hex), brand identity, and cross-app values. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/constants build
bun --filter @resq-systems/constants test
bun --filter @resq-systems/constants tsc
```

## What's here

- `tokens.ts` — design tokens (entry `./tokens`).
- `brand.ts` — brand identity values (entry `./brand`).
- `index.ts` — barrel (entry `.`).

## Dependencies

- **Runtime:** none.
- **Peers:** none.

## Rules

- **Zero runtime deps** — never add a dependency here.
- Tokens ship in two forms: `oklch` for apps and email-safe `hex` for email. `@resq-systems/email-templates` consumes the hex tokens, so keep both forms in sync.
- Must stay tree-shakeable; export granular constants, not one giant object.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/constants`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
