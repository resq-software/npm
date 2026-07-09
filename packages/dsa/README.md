<!--
  Copyright 2026 ResQ Systems, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# @resq-sw/dsa

[![npm](https://img.shields.io/npm/v/%40resq-sw%2Fdsa?style=flat-square)](https://www.npmjs.com/package/@resq-sw/dsa)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](../../LICENSE.md)
[![deps](https://img.shields.io/badge/runtime%20deps-0-25c68a?style=flat-square)](./package.json)

Production-grade data structures and algorithms for the ResQ platform — graph traversal, heaps, tries, bloom filters, sketches, distance math, queues, and string search. **Zero runtime dependencies.** `effect` is an optional peer dependency that unlocks runtime schema validation for hot-path inputs.

## Install

```sh
bun add @resq-sw/dsa
# or
npm install @resq-sw/dsa
```

## Modules

| Module | Class / Helper | Use case |
| :--- | :--- | :--- |
| `heap` | `BoundedHeap<T extends Distanced>` | Top-K smallest by `distance` (k-nearest neighbour, ranking) |
| `graph` | `Graph`, `addValidatedEdge`, `isValidVertexId` | BFS, DFS, Dijkstra, A*, topological sort |
| `trie` | `Trie`, `rabinKarp` | Prefix lookup, autocomplete, dispatch routing |
| `bloom` | `BloomFilter` | Probabilistic set membership with bounded error rate |
| `count-min` | `CountMinSketch` | Approximate frequency counting at sub-linear memory |
| `priority-queue` | `PriorityQueue`, `createDeadlineQueue`, `createPriorityLevelQueue`, `createMaxHeap`, `createMinHeap` | Priority dispatch, triage, scheduling |
| `rabin-karp` | `RabinKarp`, `quickSearch` | Multi-pattern string search with rolling hash |
| `distance` | `Distance` | Haversine, Euclidean, Manhattan, Vincenty, Chebyshev |
| `queue` | `Queue` | O(1) FIFO with linked-list backing |
| `lru-cache` | `LRUCache` | O(1) get/set with capacity and optional TTL |
| `schemas` | (subpath: `@resq-sw/dsa/schemas`) | Optional Effect schemas for input validation |

## Quick start

### A* pathfinding

```ts
import { Graph } from "@resq-sw/dsa";

const g = new Graph<string>({ directed: false });
g.addEdge("base", "alpha", 10);
g.addEdge("alpha", "site-7", 6);
g.addEdge("base", "site-7", 18);

const positions: Record<string, { x: number; y: number }> = {
  base: { x: 0, y: 0 },
  alpha: { x: 5, y: 2 },
  "site-7": { x: 9, y: 4 },
};

const result = g.aStar(
  "base",
  "site-7",
  (a, b) => Math.abs(positions[a].x - positions[b].x), // heuristic
);
// → { path: ["base", "alpha", "site-7"], cost: 16, expanded: 3 }
```

### Triage queue

```ts
import { createPriorityLevelQueue } from "@resq-sw/dsa";

const triage = createPriorityLevelQueue<{ id: string; severity: number }>(
  (item) => item.severity,
);

triage.enqueue({ id: "alpha", severity: 3 });
triage.enqueue({ id: "bravo", severity: 1 });
triage.enqueue({ id: "charlie", severity: 5 });

triage.dequeue(); // → { id: "charlie", severity: 5 }
```

### Bloom filter for survey deduplication

```ts
import { BloomFilter } from "@resq-sw/dsa";

const seen = new BloomFilter(/* capacity */ 100_000, /* errorRate */ 0.001);

if (!seen.has(droneId)) {
  seen.add(droneId);
  recordSurvey(droneId);
}
```

### Distance calculations

```ts
import { Distance } from "@resq-sw/dsa";

Distance.haversine([34.052, -118.243], [40.713, -74.006]); // metres between LA and NYC
Distance.euclidean([1, 2, 3], [4, 6, 8]);
Distance.manhattan([0, 0], [3, 4]);
```

### LRU cache

```ts
import { LRUCache } from "@resq-sw/dsa";

const cache = new LRUCache<string, Buffer>({ maxSize: 1024, defaultTTL: 60_000 });
cache.set("tile:42:17", buffer);
cache.get("tile:42:17"); // → Buffer | undefined

// Compute-on-miss helper
await cache.getOrCompute("user:42", () => fetchUser(42));
```

## Optional Effect schemas

`effect` is a peer dependency. Install it only if you want runtime validation:

```sh
bun add effect
```

```ts
import { addValidatedEdge, isValidVertexId } from "@resq-sw/dsa";

if (isValidVertexId(input)) {
  addValidatedEdge(graph, input, neighbour, weight);
}
```

The validators short-circuit and return descriptive errors instead of throwing on bad input — safe to call on user-supplied IDs.

## Performance notes

- All collections are tree-shakeable; importing `BloomFilter` does not pull in `Graph`.
- `BoundedHeap` keeps a sorted array — optimal when `limit` is small (k-NN style use).
- `PriorityQueue` is a binary heap with O(log n) `enqueue`/`dequeue`.
- `Graph.aStar` returns the number of expanded nodes for benchmarking heuristics.
- `BloomFilter` sizing follows `m = -n · ln(p) / (ln 2)²`, `k = (m/n) · ln 2`.

## Development

```sh
bun --filter @resq-sw/dsa test       # vitest
bun --filter @resq-sw/dsa build      # tsdown → lib/
```

Benchmarks live in `tests/perf/` and run via `bun --filter @resq-sw/dsa bench`.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Peer Dependencies**: `effect` (optional, for input validation schemas)

## Configuration

- **Optional Schemas**: Import from `@resq-sw/dsa/schemas` to enable input constraints validation.

## Testing

```sh
bun --filter @resq-sw/dsa test
```

## Troubleshooting

- **Timing Noise in Benchmarks**: Algorithmic complexity tests (Vitest) can flake if the runner CPU is highly throttled. Run them separately with isolated CPU cores.


## License

Apache-2.0 — see [LICENSE.md](../../LICENSE.md).
