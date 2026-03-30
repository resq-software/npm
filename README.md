# ResQ npm Packages

[![CI](https://img.shields.io/github/actions/workflow/status/resq-software/npm/ci.yml?branch=master&label=ci&style=flat-square)](https://github.com/resq-software/npm/actions)
[![@resq-sw/dsa](https://img.shields.io/npm/v/%40resq-sw%2Fdsa?style=flat-square&label=%40resq-sw%2Fdsa)](https://www.npmjs.com/package/@resq-sw/dsa)
[![@resq-sw/ui](https://img.shields.io/npm/v/%40resq-sw%2Fui?style=flat-square&label=%40resq-sw%2Fui)](https://www.npmjs.com/package/@resq-sw/ui)
[![Storybook](https://img.shields.io/badge/storybook-chromatic-FF4785?style=flat-square)](https://master--69b2711843dac80a70e4ca83.chromatic.com)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)

> A shared React component library and DSA utilities for the ResQ platform, built on shadcn/ui and Radix UI.

## Packages

| Package | Install | Version |
|---------|---------|---------|
| `@resq-sw/dsa` | `npm install @resq-sw/dsa` | [![npm](https://img.shields.io/npm/v/%40resq-sw%2Fdsa?style=flat-square)](https://www.npmjs.com/package/@resq-sw/dsa) |
| `@resq-sw/ui` | `npm install @resq-sw/ui` | [![npm](https://img.shields.io/npm/v/%40resq-sw%2Fui?style=flat-square)](https://www.npmjs.com/package/@resq-sw/ui) |

## Packages

| Package | Description | Version |
| :--- | :--- | :--- |
| [`@resq-sw/ui`](https://www.npmjs.com/package/@resq-sw/ui) | React component library (Radix + Tailwind) | [![npm](https://img.shields.io/npm/v/@resq-sw/ui)](https://www.npmjs.com/package/@resq-sw/ui) |
| [`@resq-sw/dsa`](https://www.npmjs.com/package/@resq-sw/dsa) | Data structures and algorithms (zero deps) | [![npm](https://img.shields.io/npm/v/@resq-sw/dsa)](https://www.npmjs.com/package/@resq-sw/dsa) |

---

## @resq-sw/dsa

Production-grade data structures and algorithms with zero runtime dependencies. TypeScript-first with full type exports.

### Installation

```bash
npm install @resq-sw/dsa
# or
bun add @resq-sw/dsa
```

### Usage

#### BloomFilter

Probabilistic set membership testing with configurable false-positive rate.

```ts
import { BloomFilter } from "@resq-sw/dsa";

const filter = new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
filter.add("drone-001");
filter.has("drone-001"); // true
filter.has("drone-999"); // false (probably)
```

#### CountMinSketch

Frequency estimation for streaming data with bounded error.

```ts
import { CountMinSketch } from "@resq-sw/dsa";

const sketch = new CountMinSketch({ width: 1024, depth: 5 });
sketch.add("event-type-A");
sketch.add("event-type-A");
sketch.estimate("event-type-A"); // >= 2
```

#### Graph (BFS, Dijkstra, A*)

Weighted directed/undirected graph with pathfinding algorithms.

```ts
import { Graph } from "@resq-sw/dsa";

const graph = new Graph<string>({ directed: true });
graph.addVertex("A");
graph.addVertex("B");
graph.addVertex("C");
graph.addEdge("A", "B", 1);
graph.addEdge("B", "C", 2);

graph.bfs("A");                // breadth-first traversal
graph.dijkstra("A", "C");     // shortest path (Dijkstra)
graph.aStar("A", "C", heuristic); // shortest path (A*)
```

#### BoundedHeap

Fixed-capacity min/max heap for top-K selection.

```ts
import { BoundedHeap } from "@resq-sw/dsa";

const heap = new BoundedHeap<{ id: string; score: number }>({
  capacity: 10,
  compare: (a, b) => a.score - b.score,
});
heap.push({ id: "item-1", score: 0.95 });
heap.peek(); // highest-scored item
```

#### Trie and rabinKarp

Prefix tree for autocomplete and string search.

```ts
import { Trie, rabinKarp } from "@resq-sw/dsa";

const trie = new Trie();
trie.insert("rescue");
trie.insert("respond");
trie.search("res"); // ["rescue", "respond"]

// Rabin-Karp string matching
const matches = rabinKarp("hello world hello", "hello");
```

#### RabinKarp and quickSearch

Advanced pattern matching with statistics.

```ts
import { RabinKarp, quickSearch } from "@resq-sw/dsa";

const rk = new RabinKarp({ pattern: "drone" });
const results = rk.searchAll("drone alpha drone beta");

// Quick single-pattern search
const found = quickSearch("payload data payload", "payload");
```

#### PriorityQueue

Configurable priority queue with factory helpers.

```ts
import {
  PriorityQueue,
  createMinHeap,
  createDeadlineQueue,
  createPriorityLevelQueue,
} from "@resq-sw/dsa";

// Min-heap by numeric value
const minHeap = createMinHeap<number>();
minHeap.enqueue(5);
minHeap.enqueue(1);
minHeap.dequeue(); // 1

// Deadline-based queue (earliest deadline first)
const deadlines = createDeadlineQueue();
deadlines.enqueue({ id: "task-1", deadline: Date.now() + 5000, priority: 1 });

// Priority level queue
const levels = createPriorityLevelQueue();
levels.enqueue({ id: "critical", priority: 0 });
levels.enqueue({ id: "normal", priority: 5 });
```

#### Distance

Distance calculations across multiple formulas: geospatial, mathematical, and set-based.

```ts
import { Distance } from "@resq-sw/dsa";

// Haversine (great-circle distance)
const nyc = { lat: 40.7128, lng: -74.006 };
const london = { lat: 51.5074, lng: -0.1278 };
Distance.haversine(nyc, london); // ~5570 km

// Euclidean
Distance.euclidean({ lat: 0, lng: 0 }, { lat: 3, lng: 4 }); // 5

// Cosine similarity distance
Distance.cosine({ lat: 1, lng: 0 }, { lat: 0, lng: 1 }); // 1 (orthogonal)

// Jaccard set dissimilarity
Distance.jaccard(new Set([1, 2, 3]), new Set([2, 3, 4])); // 0.5

// 3D with altitude
Distance.threed(
  { lat: 40.7128, lng: -74.006, alt: 100 },
  { lat: 51.5074, lng: -0.1278, alt: 200 },
);

// Generic calculate method
Distance.calculate("vincenty", nyc, london);
Distance.calculate("manhattan", nyc, london);
Distance.calculate("chebyshev", nyc, london);
Distance.calculate("hamming", nyc, london);
Distance.calculate("sorensen-dice", new Set([1, 2]), new Set([2, 3]));
```

Supported formulas: `euclidean`, `haversine`, `vincenty`, `manhattan`, `chebyshev`, `minkowski`, `threed`, `cosine`, `hamming`, `jaccard`, `sorensen-dice`.

### Optional Effect Schemas

For runtime validation using [Effect](https://effect.website/), import from the `/schemas` subpath. Effect is an optional peer dependency and not required for core usage.

```ts
import { /* schema exports */ } from "@resq-sw/dsa/schemas";
```

---

## @resq-sw/ui

A production-ready React component library built with Radix UI primitives, Tailwind CSS v4, and strict TypeScript safety. Dark-first design with oklch color system, tree-shakeable subpath exports, and WCAG 2.1 AA accessibility.

See the full documentation in [`packages/ui/README.md`](packages/ui/README.md).

### Quick Start

```bash
bun add @resq-sw/ui react react-dom tailwindcss
```

```tsx
import "@resq-sw/ui/styles/globals.css";
import { Button } from "@resq-sw/ui/button";
import { Card } from "@resq-sw/ui/card";

export const App = () => (
  <Card>
    <Button onClick={() => alert("Ready!")}>Click Me</Button>
  </Card>
);
```

---

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.x
- Node.js >= 20.19.0

### Workspace Setup

```bash
git clone https://github.com/resq-software/npm.git
cd npm
bun install
```

### Commands

```bash
bun install                      # Install all workspace dependencies
bun test                         # Run all workspace tests
bun --filter @resq-sw/dsa test   # Test DSA package only
bun --filter @resq-sw/ui test    # Test UI package only
bun --filter @resq-sw/ui build   # Build UI package
bun --filter @resq-sw/dsa build  # Build DSA package
```

### Package-Specific Development

Each package has its own scripts. Navigate to the package directory or use `bun --filter`:

```bash
# UI: Start Storybook
bun --filter @resq-sw/ui storybook

# UI: Lint with Biome
bun --filter @resq-sw/ui lint

# DSA: Type-check
bun --filter @resq-sw/dsa build
```

## Contributing

1. **Commit Convention**: Follow [Conventional Commits](https://www.conventionalcommits.org/).
2. **Quality Standards**: All code must pass linting, type-checking, and tests before submission.
3. **Branching**: Branch from `main` and submit a Pull Request.
4. **Testing**: Run `bun test` from the workspace root before finalizing.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [DEVELOPMENT.md](.github/DEVELOPMENT.md) for full details.

## License

This project is licensed under the Apache-2.0 License. See [LICENSE.md](./LICENSE.md) for details.

Copyright 2026 ResQ Software
