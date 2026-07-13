# AGENTS.md — @resq-systems/security

Security utilities: encryption, input validation, schemas, and PII sanitization. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/security build
bun --filter @resq-systems/security test
```

## What's here

- `crypto.ts` — encryption utilities (entry `./crypto`).
- `validators.ts` — input validation and Effect Schemas (entry `./validators`).
- `sanitize.ts` — PII / HTML sanitization (entry `./sanitize`).
- Core barrel (entry `.`).

## Dependencies

- **Runtime:** `@resq-systems/types`, `dompurify`.
- **Peers:** `effect`, `jsdom`.

## Rules

- **Security-sensitive — review changes carefully** (run the security-reviewer agent for crypto/validation/sanitization edits).
- Server-side HTML sanitization uses `dompurify` + `jsdom` (**peer**). Never inject unsanitized HTML.
- Validators return Effect Schemas (`effect` **peer**) — validate at the boundary; never trust external input.
- Do not log or leak secrets or PII.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/security`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
