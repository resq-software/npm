/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Public API for `@resq-systems/dsa` — production-grade data structures
 * and algorithms with zero runtime dependencies.
 *
 * Tree-shakeable: importing one collection (e.g. `BloomFilter`) does not pull in
 * the others. The `effect` peer dependency is optional; install it only to use
 * the runtime schema validators exposed via {@link addValidatedEdge}.
 *
 * @module @resq-systems/dsa
 *
 * @example Graph traversal
 * ```ts
 * import { Graph } from "@resq-systems/dsa";
 *
 * const g = new Graph<string>({ directed: true });
 * g.addEdge("base", "alpha", 5);
 * g.addEdge("alpha", "site-7", 3);
 * const result = g.findShortestPath("base", "site-7");
 * result.path; // → ["base", "alpha", "site-7"]
 * ```
 *
 * @example Priority dispatch
 * ```ts
 * import { createPriorityLevelQueue } from "@resq-systems/dsa";
 *
 * // Orders by `priority` (1 = most urgent), breaking ties by `deadline`.
 * const triage = createPriorityLevelQueue();
 * triage.enqueue({ id: "alpha", deadline: new Date("2025-01-11"), priority: 5, status: "open" });
 * triage.enqueue({ id: "bravo", deadline: new Date("2025-01-10"), priority: 1, status: "open" });
 * triage.dequeue(); // → { id: "bravo", priority: 1, ... }
 * ```
 *
 * @example Probabilistic membership
 * ```ts
 * import { BloomFilter } from "@resq-systems/dsa";
 *
 * const seen = new BloomFilter(100_000, 0.001);
 * seen.add("drone-04");
 * seen.has("drone-04"); // → true (always)
 * seen.has("drone-99"); // → false (probably; 0.1% false-positive rate)
 * ```
 */

export { BoundedHeap } from "./heap.js";
export type { Distanced } from "./heap.js";
export { Graph, addValidatedEdge, isValidVertexId } from "./graph.js";
export type { Edge, GraphOptions, PathResult, TraversalResult, Vertex } from "./graph.js";
export { Trie, rabinKarp } from "./trie.js";
export type { TrieOptions, TrieSearchResult } from "./trie.js";
export { BloomFilter } from "./bloom.js";
export { CountMinSketch } from "./count-min.js";
export {
	PriorityQueue,
	createDeadlineQueue,
	createPriorityLevelQueue,
	createMaxHeap,
	createMinHeap,
	validatePriorityItem,
} from "./priority-queue.js";
export type {
	CompareFn,
	PQArgs,
	PQOptions,
	PriorityQueueOptions,
	PriorityQueueStats,
	PriorityRequestItem,
} from "./priority-queue.js";
export { RabinKarp, quickSearch } from "./rabin-karp.js";
export type { PatternMatch, RabinKarpOptions, SearchStats } from "./rabin-karp.js";
export { Distance } from "./distance.js";
export { Queue } from "./queue.js";
export type { QueueNode } from "./queue.js";
export { LRUCache } from "./lru-cache.js";
export type { LRUCacheOptions } from "./lru-cache.js";
export {
	isLatitude,
	isLongitude,
	isProbability,
	toLatitude,
	toLongitude,
	toProbability,
} from "./schemas.js";
export type { Latitude, Longitude, Probability } from "./schemas.js";
