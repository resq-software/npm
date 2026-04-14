# AGENTS.md

## Dev Environment

```bash
bun install && bun run build
```

## Testing

```bash
bun test                             # All packages
bun --filter @resq-sw/<pkg> test     # Single package
```

## Architecture

| Package | Purpose | Deps |
|---------|---------|------|
| `@resq-sw/ui` | React component library (Radix + Tailwind v4, 57 components) | radix-ui, tailwindcss |
| `@resq-sw/dsa` | Data structures and algorithms (graph, heap, trie, bloom, etc.) | **zero deps** |
| `@resq-sw/helpers` | Utilities, type guards, result types, formatting | @resq-sw/logger |
| `@resq-sw/http` | Effect-based HTTP client with retry, timeout, schema validation | effect |
| `@resq-sw/logger` | Structured logging with levels and decorators | **zero deps** |
| `@resq-sw/decorators` | TypeScript method/class decorators (memoize, throttle, bind, etc.) | **zero deps** |
| `@resq-sw/security` | Encryption, input validation, PII sanitization | effect (peer) |
| `@resq-sw/rate-limiting` | Token bucket, leaky bucket, sliding window, throttle/debounce | effect, @upstash/ratelimit (peers) |

## Key Rules

- `@resq-sw/dsa` must have **zero runtime deps**. Effect is a peer dep for optional schemas only.
- `@resq-sw/ui` uses **dark-first oklch color system** with WCAG AA contrast.
- All packages must be **tree-shakeable** with subpath exports.
- **Zero `any`** — strict TypeScript throughout.
- Package manager is **bun** — do not use npm, yarn, or pnpm.
- `console-fail-test` is active in UI tests: any `console.log/warn/error` inside a test fails it.

## Commits & Changesets

**Commits:** Conventional format (`feat:`, `fix:`, `chore:`, `perf:`, `refactor:`).

**Changesets:** Every PR that changes package behavior must include a changeset file in `.changeset/`. Since the CLI is interactive, create the file directly:

```md
---
"@resq-sw/dsa": minor
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
