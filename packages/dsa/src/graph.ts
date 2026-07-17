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
 * @fileoverview Weighted directed/undirected graph for hierarchy modeling and
 * routing. Supports BFS, DFS, Dijkstra's shortest path, A* search, and
 * topological sort.
 *
 * @module @resq-systems/dsa/graph
 */

import {
	GraphEdgeSchema,
	GraphOptionsSchema,
	type VertexId,
	VertexIdSchema,
	validateSafe,
} from "./schemas.js";

//#region Types

/**
 * Edge in the graph.
 *
 * @template T - Type of vertex identifiers.
 * @template M - Shape of the optional structured metadata. Defaults to
 *   `Record<string, unknown>` so unparameterised `Edge<T>` keeps the previous
 *   loosely-typed metadata; supply a concrete `M` for typed reads.
 */
export interface Edge<T, M = Record<string, unknown>> {
	/** Target vertex */
	target: T;
	/** Edge weight (default: 1) */
	weight: number;
	/** Optional metadata, typed as `M`. */
	metadata?: M;
}

/**
 * Vertex with adjacency list.
 *
 * @template T - Type of vertex identifiers.
 * @template M - Shape of the optional structured metadata (see {@link Edge}).
 */
export interface Vertex<T, M = Record<string, unknown>> {
	/** Vertex value/id */
	value: T;
	/** Outgoing edges */
	edges: Edge<T, M>[];
	/** Optional vertex metadata, typed as `M`. */
	metadata?: M;
}

/**
 * Result of a shortest-path search.
 *
 * The fields move together: when {@link found} is `false` (no route exists),
 * `path` is empty and `distance` is `Number.POSITIVE_INFINITY`. When `found`
 * is `true`, `path` runs from source to target inclusive and `distance` is its
 * summed edge weight (`0` for a source-equals-target path).
 */
export interface PathResult<T> {
	/** Vertices from source to target inclusive; empty when `found` is `false`. */
	path: T[];
	/** Total summed edge weight; `Infinity` when `found` is `false`. */
	distance: number;
	/** Whether a path from source to target was found. */
	found: boolean;
}

/**
 * Result of a graph traversal (BFS or DFS).
 *
 * All three collections cover exactly the vertices reachable from the start,
 * and are empty when the start vertex is not in the graph.
 */
export interface TraversalResult<T> {
	/** Reachable vertices in the order they were visited. */
	vertices: T[];
	/**
	 * Maps each visited vertex to the vertex it was reached from; the start
	 * vertex maps to `null`. Follow it back to reconstruct a path.
	 */
	parents: Map<T, T | null>;
	/**
	 * Maps each visited vertex to its distance from the start: hop count for
	 * {@link Graph.bfs}, recursion depth for {@link Graph.dfs}.
	 */
	distances: Map<T, number>;
}

/**
 * Options for graph creation.
 */
export interface GraphOptions {
	/** Whether the graph is directed (default: true) */
	directed?: boolean;
}

//#endregion

//#region Public API

/**
 * Weighted Graph with Adjacency List representation
 *
 * Supports both directed and undirected graphs with weighted edges.
 * Implements common graph algorithms including BFS, DFS, Dijkstra's shortest
 * path, A* search, and topological sort.
 *
 * Time Complexity:
 * - addVertex: O(1)
 * - addEdge: O(1)
 * - removeVertex: O(V + E)
 * - removeEdge: O(E)
 * - BFS/DFS: O(V + E)
 * - Dijkstra/A*: O((V + E) log V) with priority queue
 *
 * Space Complexity: O(V + E)
 *
 * @template T - Type of vertex identifiers
 * @template M - Shape of the optional structured metadata attached to
 *   vertices and edges. Defaults to `Record<string, unknown>` so existing
 *   `Graph<T>` usage keeps compiling; supply a concrete `M` (for example
 *   `Graph<string, { lastSeen: number }>`) to get typed reads from
 *   {@link Graph.getVertexMetadata} and {@link Graph.getNeighbors}.
 *
 * @example
 * ```ts
 * const graph = new Graph<string>();
 * graph.addVertex('A').addVertex('B').addVertex('C');
 * graph.addEdge('A', 'B', 1);
 * graph.addEdge('A', 'C', 4);
 * const path = graph.findShortestPath('A', 'C');
 * ```
 */
export class Graph<T, M = Record<string, unknown>> {
	private adjacencyList: Map<T, Vertex<T, M>>;
	private readonly directed: boolean;

	/**
	 * Creates a new graph.
	 *
	 * @param options - Configuration options.
	 * @throws {Error} If options validation fails.
	 */
	constructor(options: GraphOptions = {}) {
		const validation = validateSafe(GraphOptionsSchema, options);
		if (!validation.success) {
			throw new Error(`Invalid Graph options: ${validation.error}`);
		}

		this.adjacencyList = new Map();
		this.directed = validation.data.directed ?? true;
	}

	/**
	 * Returns the number of vertices in the graph.
	 */
	get vertexCount(): number {
		return this.adjacencyList.size;
	}

	/**
	 * Returns the total number of edges in the graph.
	 */
	get edgeCount(): number {
		let count = 0;
		for (const vertex of this.adjacencyList.values()) {
			count += vertex.edges.length;
		}
		return this.directed ? count : count / 2;
	}

	/**
	 * Checks whether the graph contains a vertex.
	 */
	hasVertex(vertex: T): boolean {
		return this.adjacencyList.has(vertex);
	}

	/**
	 * Checks whether an edge exists from `source` to `target`.
	 */
	hasEdge(source: T, target: T): boolean {
		const vertex = this.adjacencyList.get(source);
		if (!vertex) return false;
		return vertex.edges.some((edge) => edge.target === target);
	}

	/**
	 * Adds a vertex to the graph. A no-op if the vertex already exists.
	 *
	 * @returns This graph, for chaining.
	 */
	addVertex(vertex: T, metadata?: M): this {
		if (!this.adjacencyList.has(vertex)) {
			this.adjacencyList.set(vertex, { value: vertex, edges: [], metadata });
		}
		return this;
	}

	/**
	 * Adds multiple vertices at once.
	 *
	 * @returns This graph, for chaining.
	 */
	addVertices(vertices: T[]): this {
		for (const vertex of vertices) {
			this.addVertex(vertex);
		}
		return this;
	}

	/**
	 * Adds (or updates) a weighted edge between two vertices, creating either
	 * endpoint if it is missing. For an undirected graph the reverse edge is
	 * added too. Re-adding an existing edge overwrites its weight and metadata.
	 *
	 * @returns This graph, for chaining.
	 */
	addEdge(source: T, target: T, weight = 1, metadata?: M): this {
		this.addVertex(source);
		this.addVertex(target);

		const sourceVertex = this.adjacencyList.get(source);
		if (sourceVertex) {
			const existingEdge = sourceVertex.edges.find((e) => e.target === target);
			if (existingEdge) {
				existingEdge.weight = weight;
				existingEdge.metadata = metadata;
			} else {
				sourceVertex.edges.push({ target, weight, metadata });
			}
		}

		if (!this.directed) {
			const targetVertex = this.adjacencyList.get(target);
			if (targetVertex) {
				const existingEdge = targetVertex.edges.find((e) => e.target === source);
				if (!existingEdge) {
					targetVertex.edges.push({ target: source, weight, metadata });
				}
			}
		}

		return this;
	}

	/**
	 * Removes a vertex and every edge that touches it.
	 *
	 * @returns `true` if the vertex existed and was removed.
	 */
	removeVertex(vertex: T): boolean {
		if (!this.adjacencyList.has(vertex)) return false;

		for (const v of this.adjacencyList.values()) {
			v.edges = v.edges.filter((edge) => edge.target !== vertex);
		}

		this.adjacencyList.delete(vertex);
		return true;
	}

	/**
	 * Removes the edge from `source` to `target` (and its reverse in an
	 * undirected graph).
	 *
	 * @returns `true` if a matching edge existed and was removed.
	 */
	removeEdge(source: T, target: T): boolean {
		const sourceVertex = this.adjacencyList.get(source);
		if (!sourceVertex) return false;

		const initialLength = sourceVertex.edges.length;
		sourceVertex.edges = sourceVertex.edges.filter((e) => e.target !== target);

		if (!this.directed) {
			const targetVertex = this.adjacencyList.get(target);
			if (targetVertex) {
				targetVertex.edges = targetVertex.edges.filter((e) => e.target !== source);
			}
		}

		return sourceVertex.edges.length < initialLength;
	}

	/**
	 * Gets the outgoing edges of a vertex, or an empty array if it is unknown.
	 */
	getNeighbors(vertex: T): Edge<T, M>[] {
		return this.adjacencyList.get(vertex)?.edges ?? [];
	}

	/**
	 * Gets all vertices in the graph.
	 */
	getVertices(): T[] {
		return Array.from(this.adjacencyList.keys());
	}

	/**
	 * Gets vertex metadata, typed as `M`.
	 */
	getVertexMetadata(vertex: T): M | undefined {
		return this.adjacencyList.get(vertex)?.metadata;
	}

	/**
	 * Breadth-first traversal from `start`, visiting nearer vertices first.
	 *
	 * @param start - Starting vertex.
	 * @returns Traversal result with vertices, parents, and hop distances. All
	 *   three collections are empty when `start` is not in the graph.
	 */
	bfs(start: T): TraversalResult<T> {
		const vertices: T[] = [];
		const parents = new Map<T, T | null>();
		const distances = new Map<T, number>();
		const visited = new Set<T>();

		if (!this.adjacencyList.has(start)) {
			return { vertices, parents, distances };
		}

		const queue: T[] = [start];
		visited.add(start);
		parents.set(start, null);
		distances.set(start, 0);

		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined) break;

			vertices.push(current);
			const currentDistance = distances.get(current) ?? 0;

			for (const edge of this.getNeighbors(current)) {
				if (!visited.has(edge.target)) {
					visited.add(edge.target);
					queue.push(edge.target);
					parents.set(edge.target, current);
					distances.set(edge.target, currentDistance + 1);
				}
			}
		}

		return { vertices, parents, distances };
	}

	/**
	 * Depth-first traversal from `start`, following each branch to its end
	 * before backtracking.
	 *
	 * @param start - Starting vertex.
	 * @returns Traversal result with vertices, parents, and depth per vertex.
	 *   All three collections are empty when `start` is not in the graph.
	 */
	dfs(start: T): TraversalResult<T> {
		const vertices: T[] = [];
		const parents = new Map<T, T | null>();
		const distances = new Map<T, number>();
		const visited = new Set<T>();

		if (!this.adjacencyList.has(start)) {
			return { vertices, parents, distances };
		}

		const dfsRecursive = (vertex: T, depth: number): void => {
			visited.add(vertex);
			vertices.push(vertex);
			distances.set(vertex, depth);

			for (const edge of this.getNeighbors(vertex)) {
				if (!visited.has(edge.target)) {
					parents.set(edge.target, vertex);
					dfsRecursive(edge.target, depth + 1);
				}
			}
		};

		parents.set(start, null);
		dfsRecursive(start, 0);

		return { vertices, parents, distances };
	}

	/**
	 * Finds the shortest path between two vertices with Dijkstra's algorithm.
	 * Assumes non-negative edge weights.
	 *
	 * @param start - Starting vertex.
	 * @param end - Ending vertex.
	 * @returns A path result; `found` is `false` with an empty path and
	 *   infinite distance when no route exists.
	 */
	findShortestPath(start: T, end: T): PathResult<T> {
		if (!this.adjacencyList.has(start) || !this.adjacencyList.has(end)) {
			return { path: [], distance: Number.POSITIVE_INFINITY, found: false };
		}

		if (start === end) {
			return { path: [start], distance: 0, found: true };
		}

		const distances = new Map<T, number>();
		const parents = new Map<T, T | null>();
		const visited = new Set<T>();

		for (const vertex of this.adjacencyList.keys()) {
			distances.set(vertex, Number.POSITIVE_INFINITY);
		}
		distances.set(start, 0);
		parents.set(start, null);

		const queue: Array<{ vertex: T; distance: number }> = [{ vertex: start, distance: 0 }];

		while (queue.length > 0) {
			queue.sort((a, b) => a.distance - b.distance);
			const current = queue.shift();
			if (!current) break;

			if (visited.has(current.vertex)) continue;
			visited.add(current.vertex);

			if (current.vertex === end) break;

			for (const edge of this.getNeighbors(current.vertex)) {
				if (visited.has(edge.target)) continue;

				const currentDist = distances.get(current.vertex) ?? Number.POSITIVE_INFINITY;
				const newDistance = currentDist + edge.weight;
				const existingDistance = distances.get(edge.target) ?? Number.POSITIVE_INFINITY;

				if (newDistance < existingDistance) {
					distances.set(edge.target, newDistance);
					parents.set(edge.target, current.vertex);
					queue.push({ vertex: edge.target, distance: newDistance });
				}
			}
		}

		const endDistance = distances.get(end);
		if (endDistance === undefined || endDistance === Number.POSITIVE_INFINITY) {
			return { path: [], distance: Number.POSITIVE_INFINITY, found: false };
		}

		const path: T[] = [];
		let current: T | null | undefined = end;
		while (current !== null && current !== undefined) {
			path.unshift(current);
			current = parents.get(current);
		}

		return { path, distance: endDistance, found: true };
	}

	/**
	 * Finds the shortest path using A* search guided by a heuristic. Returns an
	 * optimal path when `h` is admissible (never overestimates the true cost).
	 *
	 * @param start - Starting vertex.
	 * @param end - Ending vertex.
	 * @param h - Heuristic estimating the cost from a vertex to `end`.
	 * @returns The path and its cost, or `null` if no path exists.
	 */
	astar(start: T, end: T, h: (a: T, b: T) => number): { path: T[]; cost: number } | null {
		if (!this.adjacencyList.has(start) || !this.adjacencyList.has(end)) return null;

		const g = new Map<T, number>([[start, 0]]);
		const f = new Map<T, number>([[start, h(start, end)]]);
		const prev = new Map<T, T>();
		const open: T[] = [start];

		while (open.length > 0) {
			open.sort((a, b) => (f.get(a) ?? Infinity) - (f.get(b) ?? Infinity));
			const u = open.shift();
			if (u === undefined) break;

			if (u === end) {
				const path: T[] = [];
				let cur: T | undefined = end;
				while (cur !== undefined) {
					path.unshift(cur);
					cur = prev.get(cur);
				}
				const cost = g.get(end);
				return cost === undefined ? null : { path, cost };
			}

			for (const edge of this.getNeighbors(u)) {
				const tentG = (g.get(u) ?? Infinity) + edge.weight;
				if (tentG < (g.get(edge.target) ?? Infinity)) {
					g.set(edge.target, tentG);
					f.set(edge.target, tentG + h(edge.target, end));
					prev.set(edge.target, u);
					if (!open.includes(edge.target)) open.push(edge.target);
				}
			}
		}

		return null;
	}

	/**
	 * Finds every simple path between two vertices, bounded by `maxDepth` to
	 * keep the search finite on large or cyclic graphs.
	 *
	 * @param start - Starting vertex.
	 * @param end - Ending vertex.
	 * @param maxDepth - Maximum path length in edges. Defaults to `10`.
	 * @returns All paths found, each an ordered list of vertices.
	 */
	findAllPaths(start: T, end: T, maxDepth = 10): T[][] {
		const paths: T[][] = [];

		if (!this.adjacencyList.has(start) || !this.adjacencyList.has(end)) {
			return paths;
		}

		const findPathsDFS = (current: T, path: T[], visited: Set<T>, depth: number): void => {
			if (depth > maxDepth) return;

			if (current === end) {
				paths.push([...path]);
				return;
			}

			for (const edge of this.getNeighbors(current)) {
				if (!visited.has(edge.target)) {
					visited.add(edge.target);
					path.push(edge.target);
					findPathsDFS(edge.target, path, visited, depth + 1);
					path.pop();
					visited.delete(edge.target);
				}
			}
		};

		const visited = new Set<T>([start]);
		findPathsDFS(start, [start], visited, 0);

		return paths;
	}

	/**
	 * Performs a topological sort (Kahn's algorithm) of a directed acyclic
	 * graph.
	 *
	 * @returns The vertices in a valid topological order, or `null` if the
	 *   graph contains a cycle.
	 * @throws {Error} If called on an undirected graph.
	 */
	topologicalSort(): T[] | null {
		if (!this.directed) {
			throw new Error("Topological sort requires a directed graph");
		}

		const inDegree = new Map<T, number>();
		const result: T[] = [];

		for (const vertex of this.adjacencyList.keys()) {
			inDegree.set(vertex, 0);
		}

		for (const vertex of this.adjacencyList.values()) {
			for (const edge of vertex.edges) {
				const currentDegree = inDegree.get(edge.target) ?? 0;
				inDegree.set(edge.target, currentDegree + 1);
			}
		}

		const queue: T[] = [];
		for (const [vertex, degree] of inDegree) {
			if (degree === 0) queue.push(vertex);
		}

		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined) break;

			result.push(current);

			for (const edge of this.getNeighbors(current)) {
				const degree = inDegree.get(edge.target) ?? 0;
				const newDegree = degree - 1;
				inDegree.set(edge.target, newDegree);
				if (newDegree === 0) queue.push(edge.target);
			}
		}

		return result.length !== this.adjacencyList.size ? null : result;
	}

	/**
	 * Detects whether the graph contains a cycle. Uses topological sorting for
	 * directed graphs and a parent-aware DFS for undirected ones.
	 */
	hasCycle(): boolean {
		if (this.directed) {
			return this.topologicalSort() === null;
		}

		const visited = new Set<T>();

		const hasCycleDFS = (vertex: T, parent: T | null): boolean => {
			visited.add(vertex);

			for (const edge of this.getNeighbors(vertex)) {
				if (!visited.has(edge.target)) {
					if (hasCycleDFS(edge.target, vertex)) return true;
				} else if (edge.target !== parent) {
					return true;
				}
			}

			return false;
		};

		for (const vertex of this.adjacencyList.keys()) {
			if (!visited.has(vertex)) {
				if (hasCycleDFS(vertex, null)) return true;
			}
		}

		return false;
	}

	/**
	 * Groups vertices into connected components. Intended for undirected
	 * graphs; on a directed graph it treats edges as bidirectional and so
	 * yields weakly-connected components.
	 *
	 * @returns One array of vertices per component.
	 */
	getConnectedComponents(): T[][] {
		const visited = new Set<T>();
		const components: T[][] = [];

		for (const vertex of this.adjacencyList.keys()) {
			if (!visited.has(vertex)) {
				const component: T[] = [];
				const queue: T[] = [vertex];

				while (queue.length > 0) {
					const current = queue.shift();
					if (current === undefined || visited.has(current)) continue;

					visited.add(current);
					component.push(current);

					for (const edge of this.getNeighbors(current)) {
						if (!visited.has(edge.target)) queue.push(edge.target);
					}
				}

				components.push(component);
			}
		}

		return components;
	}

	/**
	 * Clears all vertices and edges.
	 */
	clear(): void {
		this.adjacencyList.clear();
	}

	/**
	 * Converts the graph to a dense adjacency-matrix representation. Absent
	 * edges are `Infinity` and the diagonal is `0`.
	 *
	 * @returns The vertex order and the corresponding weight matrix.
	 */
	toAdjacencyMatrix(): { vertices: T[]; matrix: number[][] } {
		const vertices = this.getVertices();
		const indexMap = new Map<T, number>();

		for (let i = 0; i < vertices.length; i++) {
			const v = vertices[i];
			if (v !== undefined) indexMap.set(v, i);
		}

		const matrix: number[][] = Array.from({ length: vertices.length }, () =>
			Array(vertices.length).fill(Number.POSITIVE_INFINITY),
		);

		for (let i = 0; i < vertices.length; i++) {
			const row = matrix[i];
			if (row) row[i] = 0;
		}

		for (const [vertex, data] of this.adjacencyList) {
			const sourceIndex = indexMap.get(vertex);
			if (sourceIndex === undefined) continue;

			for (const edge of data.edges) {
				const targetIndex = indexMap.get(edge.target);
				if (targetIndex !== undefined) {
					const row = matrix[sourceIndex];
					if (row) row[targetIndex] = edge.weight;
				}
			}
		}

		return { vertices, matrix };
	}
}

//#endregion

//#region Utilities

/**
 * Validates an edge with Effect Schema before adding it to a string-keyed
 * graph, so malformed input is rejected instead of silently corrupting it.
 *
 * @param graph - The target graph.
 * @param source - Source vertex id.
 * @param target - Target vertex id.
 * @param weight - Edge weight. Defaults to `1`.
 * @returns `true` if the edge passed validation and was added.
 */
export function addValidatedEdge(
	graph: Graph<string>,
	source: string,
	target: string,
	weight = 1,
): boolean {
	const validation = validateSafe(GraphEdgeSchema, { source, target, weight });
	if (!validation.success) return false;
	graph.addEdge(validation.data.source, validation.data.target, validation.data.weight ?? 1);
	return true;
}

/**
 * Type guard that validates a vertex id with Effect Schema and narrows it to
 * the branded {@link VertexId} type.
 *
 * @param id - The value to check.
 * @returns `true` if `id` is a valid vertex id.
 */
export function isValidVertexId(id: unknown): id is VertexId {
	const validation = validateSafe(VertexIdSchema, id);
	return validation.success;
}
//#endregion
