# AGENTS.md — @resq-systems/types

Zero-dependency advanced TypeScript type toolkit: nominal brands, exhaustiveness helpers, deep object/collection/string utilities, and a type-level test kit. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/types build
bun --filter @resq-systems/types test
```

## What's here

- `brand.ts` — nominal brand types (entry `./brand`).
- `object.ts`, `collection.ts`, `string.ts`, `numeric.ts` — deep type utilities.
- `assert.ts` — exhaustiveness / runtime assert helpers.
- `testing.ts` — type-level test kit (entry `./testing`).
- `*.test-d.ts` — type-level tests; core barrel is entry `.`.

## Dependencies

- **Runtime:** none.
- **Peers:** none.

## Rules

- **Zero runtime deps** and mostly type-only.
- Foundational package — many workspace packages depend on it, so treat the exported types as a public API. Breaking a type is a `major` bump.
- Type-level tests (`*.test-d.ts`) are checked by `tsc`; a clean `tsc` is part of the contract.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/types`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
