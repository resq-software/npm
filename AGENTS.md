# AGENTS.md

## Dev Environment

```bash
bun install && bun run build
```

## Testing

```bash
bun test                             # All packages
bun --filter @resq-systems/<pkg> test     # Single package
```

## Architecture

Each package has its own `AGENTS.md` (and synced `CLAUDE.md`) with package-specific commands, structure, and rules.

| Package | Purpose | Deps |
|---------|---------|------|
| `@resq-systems/ui` | shadcn-based design system (Radix + base-ui + Tailwind v4) | radix-ui, base-ui, recharts; react, tailwindcss (peers) |
| `@resq-systems/analytics` | Unified PostHog + GA4 client — cross-subdomain, lazy-loaded, typed events | @resq-systems/types; posthog-js, react (peers) |
| `@resq-systems/dsa` | Data structures and algorithms (graph, heap, trie, bloom, LRU, count-min, etc.) | **zero deps** (effect peer for `./schemas`) |
| `@resq-systems/helpers` | Utilities, type guards, result types, formatting, async tasks | @resq-systems/logger, @resq-systems/types, tinyqueue |
| `@resq-systems/http` | Effect-based HTTP client with retry, timeout, schema validation | @resq-systems/types; effect, @effect/platform-bun (peers) |
| `@resq-systems/logger` | Structured logging with levels and decorators (Node + Bun) | **zero deps** |
| `@resq-systems/decorators` | TypeScript method/class decorators (memoize, throttle, bind, etc.) | **zero deps** |
| `@resq-systems/security` | Encryption, input validation, PII sanitization | @resq-systems/types, dompurify; effect, jsdom (peers) |
| `@resq-systems/rate-limiting` | Token bucket, leaky bucket, sliding window, throttle/debounce | @resq-systems/dsa, @resq-systems/types; effect, @upstash/* (peers) |
| `@resq-systems/constants` | Design tokens (oklch + email-safe hex), brand identity, cross-app values | **zero deps** |
| `@resq-systems/email-templates` | Type-safe transactional emails (Effect Schema + React Email + optional Resend) | @resq-systems/constants, @react-email/*; effect, react, resend (peers) |
| `@resq-systems/types` | Advanced TypeScript type toolkit (nominal brands, deep utils, type-test kit) | **zero deps** |

## Key Rules

- `@resq-systems/dsa` must have **zero runtime deps**. Effect is a peer dep for optional schemas only.
- Zero-runtime-dep packages: `dsa`, `logger`, `decorators`, `constants`, `types`. Don't add dependencies to these.
- `@resq-systems/ui` uses **dark-first oklch color system** with WCAG AA contrast.
- All packages must be **tree-shakeable** with subpath exports.
- **Zero `any`** — strict TypeScript throughout.
- Package manager is **bun** — do not use npm, yarn, or pnpm.
- `console-fail-test` is active in UI tests: any `console.log/warn/error` inside a test fails it.

## Commits & Changesets

**Commits:** Conventional format (`feat:`, `fix:`, `chore:`, `perf:`, `refactor:`).

**Changesets:** Every PR that changes package behavior must include a changeset file in `.changeset/`. Since the CLI is interactive, create the file directly:

```md
---
"@resq-systems/dsa": minor
---

Add LRU cache data structure with configurable capacity
```

Bump types: `patch` (bug fix), `minor` (new feature), `major` (breaking change). See [CLAUDE.md](CLAUDE.md#changesets) for full rules and examples.

## References

- [Contributing Guide](.github/CONTRIBUTING.md)
- [Development Guide](.github/DEVELOPMENT.md)
- [Style Guide](design/STYLE_GUIDE.md)

## Git hooks

Canonical hooks from [`resq-software/dev`](https://github.com/resq-software/dev).
Install:

```sh
curl -fsSL https://raw.githubusercontent.com/resq-software/dev/main/scripts/install-hooks.sh | sh
```

Contract: [dev/AGENTS.md#git-hooks](https://github.com/resq-software/dev/blob/main/AGENTS.md#git-hooks). Repo-specific logic lives in `.git-hooks/local-*`:

- `local-pre-push` — `bunx biome check` lint gate
- `local-post-checkout` / `local-post-merge` — auto `bun install` on lockfile change (override with `SKIP_BUN_INSTALL=1`)
