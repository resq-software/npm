# AGENTS.md — @resq-systems/math

Type-safe mathematical expression engine with sort-based dispatch, Pratt parser, and static validation. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/math build
bun --filter @resq-systems/math test
```

## What's here

- `error.ts` — typed error hierarchy (`MathError`, `SortError`, `DomainError`, etc.)
- `value.ts` — sort-tagged runtime values (`num`, `set`, `bool`)
- `ast.ts` — AST node discriminated union (8 node kinds)
- `builder.ts` — ergonomic AST constructors (`N`, `S`, `add`, `sum`, etc.)
- `instance.ts` — type-class dispatch tables (op × sort → implementation)
- `evaluate.ts` — tree-walking evaluator
- `check.ts` — static sort inference and validation
- `print.ts` — pretty printer (AST → string, Unicode and ASCII modes)
- `parse.ts` — Pratt parser (string → AST, Unicode and ASCII input)
- Core barrel (entry `.`).

## Dependencies

- **Runtime:** none.

## Rules

- **MUST have zero runtime deps** — a hard workspace invariant. Do not add dependencies.
- Every module must be tree-shakeable — importing `evaluate` should not pull in `parse`.
- All AST nodes and values are deeply `readonly`.
- Error classes carry structured context, not just message strings.
- The dispatch tables are extensible via `register*` functions but ship with complete built-in instances.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/math`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
