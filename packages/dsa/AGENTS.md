# AGENTS.md — @resq-systems/dsa

Production-grade data structures and algorithms: graph, heap, trie, bloom filter, LRU cache, count-min sketch, Rabin-Karp, priority queue. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/dsa build
bun --filter @resq-systems/dsa test
```

## What's here

- One module per structure: `graph.ts`, `heap.ts`, `trie.ts`, `bloom.ts`, `lru-cache.ts`, `count-min.ts`, `priority-queue.ts`, `queue.ts`, `rabin-karp.ts`, `distance.ts`.
- `schemas.ts` — optional Effect Schema definitions (entry `./schemas`).
- Core barrel (entry `.`).

## Dependencies

- **Runtime:** none.
- **Peers:** `effect` (used only by `./schemas`).

## Rules

- **MUST have zero runtime deps** — a hard workspace invariant, CI-enforced. Do not add dependencies.
- `effect` is a **peer** consumed only by the optional `./schemas` entry; the core (`.`) must never import it.
- Every structure must be tree-shakeable — one export path per module.
- `@resq-systems/rate-limiting` builds on this package; keep the public API stable.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/dsa`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
