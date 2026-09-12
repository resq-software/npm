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
- `threats/` — context-aware threat rule engine (entry `./threats`). `types.ts` defines
  the vocabulary, `rules/` holds the catalog split by domain, `variants.ts` builds
  canonicalization variants, `scoring.ts` computes the anomaly score, `engine.ts` runs
  the scan.
- `unicode/` — UTS #39 identifier security (entry `./unicode`). `confusables.ts` holds
  the fold tables and skeleton generation; `index.ts` adds script analysis and
  restriction levels.
- `paths.ts` — CWE-22 path containment (entry `./paths`). **Node only** — it imports
  `node:path` statically and is deliberately not re-exported from the root barrel.
- `validators.ts` — field validators, output encoders, and the back-compatible wrapper
  over the engine (entry `./validators`).
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
- **Detection is not the control.** Every rule carries a `primaryControl` naming the
  actual fix. Never present a signature as the thing that makes an application safe.
- **Every rule declares its contexts.** A rule that runs on `general_text` must have no
  legitimate use anywhere — currently only bidirectional, invisible, and control
  characters qualify. SQL keywords and `../` do not.
- **Rule patterns must be non-global and bounded.** `assertRuleCatalogIsValid` rejects
  `/g` and `/y` at import; `tests/regex-safety.test.ts` rejects unbounded quantifiers,
  backreferences, and anything exceeding its time budget on adversarial input.
- **Add benign fixtures with every rule.** `tests/fixtures/corpora.ts` asserts zero false
  positives across natural language, source code, international names, filesystem
  documentation, and SQL prose. A rule that breaks those is not ready.
- Rule IDs are stable and never reused once retired.
- Never run confusable or injection detectors against people's names — use
  `validatePersonName`. See the `unicode/index.ts` overview for why.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/security`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [ASVS conformance](ASVS-CONFORMANCE.md) — what the package provides toward ASVS 5.0
  V1/V11/V16, and what it deliberately does not. Pinned to a commit and verified by a test.
- [WSTG coverage](WSTG-COVERAGE.md) — what the catalog detects, what it deliberately
  cannot, and the deferred `unsafe_upload` work. **Read §2 before adding a rule for a
  weakness that looks uncovered** — several are uncovered on purpose.
- [Workspace guide](../../AGENTS.md)
