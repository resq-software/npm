---
name: lint
description: Run Biome lint and detect unused exports with knip.
---

# /lint

Lint the `@resq-sw/ui` library.

## Steps

1. Run `bun lint` — Biome check.
2. Run `bun lint:knip` — detect unused exports and files.
3. Run `bun lint:spelling` — cspell spell check.
4. Report all violations. Remove dead exports rather than suppressing knip warnings.
