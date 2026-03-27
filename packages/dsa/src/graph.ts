/**
 * Copyright 2026 ResQ Software
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
 * @file Graph Data Structure with BFS/DFS, Shortest Path, and A*
 * @module dsa/graph
 * @description Weighted directed/undirected graph for hierarchy modeling and routing.
 *              Supports BFS, DFS, Dijkstra's shortest path, A* search, and topological sort.
 */

import { GraphEdgeSchema, GraphOptionsSchema, VertexIdSchema, validateSafe } from './schemas.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Edge in the graph
 */
export interface Edge<T> {
  /** Target vertex */
  target: T;
  /** Edge weight (default: 1) */
  weight: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Vertex with adjacency list
 */
export interface Vertex<T> {
  /** Vertex value/id */
  value: T;
  /** Outgoing edges */
  edges: Edge<T>[];
  /** Optional vertex metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Path result from shortest path algorithms
 */
export interface PathResult<T> {
  /** Ordered list of vertices in the path */
  path: T[];
  /** Total distance/weight of the path */
  distance: number;
  /** Whether a path was found */
  found: boolean;
}

/**
 * Graph traversal result
 */
export interface TraversalResult<T> {
  /** Vertices in traversal order */
  vertices: T[];
  /** Parent map for path reconstruction */
  parents: Map<T, T | null>;
  /** Distance from source (for BFS) */
  distances: Map<T, number>;
}

/**
 * Options for graph creation
 */
export interface GraphOptions {
  /** Whether the graph is directed (default: true) */
  directed?: boolean;
}

// ============================================
// Graph Implementation
// ============================================

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
 *
 * @example
 * ```typescript
 * const graph = new Graph<string>();
 * graph.addVertex('A').addVertex('B').addVertex('C');
 * graph.addEdge('A', 'B', 1);
 * graph.addEdge('A', 'C', 4);
 * const path = graph.findShortestPath('A', 'C');
 * ```
 */
export class Graph<T> {
  private adjacencyList: Map<T, Vertex<T>>;
  private readonly directed: boolean;

  /**
   * Creates a new Graph
   * @param options - Configuration options
   * @throws Error if options validation fails
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
   * Returns the number of vertices in the graph
   */
  get vertexCount(): number {
    return this.adjacencyList.size;
  }

  /**
   * Returns the total number of edges in the graph
   */
  get edgeCount(): number {
    let count = 0;
    for (const vertex of this.adjacencyList.values()) {
      count += vertex.edges.length;
    }
    return this.directed ? count : count / 2;
  }

  /**
   * Checks if the graph has a vertex
   */
  hasVertex(vertex: T): boolean {
    return this.adjacencyList.has(vertex);
  }

  /**
   * Checks if an edge exists between two vertices
   */
  hasEdge(source: T, target: T): boolean {
    const vertex = this.adjacencyList.get(source);
    if (!vertex) return false;
    return vertex.edges.some((edge) => edge.target === target);
  }

  /**
   * Adds a vertex to the graph
   * @returns This graph for chaining
   */
  addVertex(vertex: T, metadata?: Record<string, unknown>): this {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, { value: vertex, edges: [], metadata });
    }
    return this;
  }

  /**
   * Adds multiple vertices at once
   * @returns This graph for chaining
   */
  addVertices(vertices: T[]): this {
    for (const vertex of vertices) {
      this.addVertex(vertex);
    }
    return this;
  }

  /**
   * Adds an edge between two vertices
   * @returns This graph for chaining
   */
  addEdge(source: T, target: T, weight = 1, metadata?: Record<string, unknown>): this {
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
   * Removes a vertex and all its edges
   * @returns True if vertex was removed
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
   * Removes an edge between two vertices
   * @returns True if edge was removed
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
   * Gets all neighbors of a vertex
   */
  getNeighbors(vertex: T): Edge<T>[] {
    return this.adjacencyList.get(vertex)?.edges ?? [];
  }

  /**
   * Gets all vertices in the graph
   */
  getVertices(): T[] {
    return Array.from(this.adjacencyList.keys());
  }

  /**
   * Gets vertex metadata
   */
  getVertexMetadata(vertex: T): Record<string, unknown> | undefined {
    return this.adjacencyList.get(vertex)?.metadata;
  }

  /**
   * Breadth-First Search traversal
   *
   * @param start - Starting vertex
   * @returns Traversal result with vertices, parents, and distances
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
   * Depth-First Search traversal
   *
   * @param start - Starting vertex
   * @returns Traversal result with vertices and parents
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
   * Finds the shortest path between two vertices using Dijkstra's algorithm
   *
   * @param start - Starting vertex
   * @param end - Ending vertex
   * @returns Path result with vertices and total distance
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
   * Finds the shortest path using A* search with a heuristic function
   *
   * @param start - Starting vertex
   * @param end - Ending vertex
   * @param h - Heuristic function estimating cost from a vertex to end
   * @returns Path and cost, or null if no path exists
   */
  astar(start: T, end: T, h: (a: T, b: T) => number): { path: T[]; cost: number } | null {
    if (!this.adjacencyList.has(start) || !this.adjacencyList.has(end)) return null;

    const g = new Map<T, number>([[start, 0]]);
    const f = new Map<T, number>([[start, h(start, end)]]);
    const prev = new Map<T, T>();
    const open: T[] = [start];

    while (open.length > 0) {
      open.sort((a, b) => (f.get(a) ?? Infinity) - (f.get(b) ?? Infinity));
      const u = open.shift()!;

      if (u === end) {
        const path: T[] = [];
        let cur: T | undefined = end;
        while (cur !== undefined) {
          path.unshift(cur);
          cur = prev.get(cur);
        }
        return { path, cost: g.get(end)! };
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
   * Finds all paths between two vertices (limited by max depth)
   *
   * @param start - Starting vertex
   * @param end - Ending vertex
   * @param maxDepth - Maximum path depth (default: 10)
   * @returns Array of all paths found
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
   * Performs topological sort on a directed acyclic graph (DAG)
   *
   * @returns Topologically sorted vertices or null if cycle detected
   * @throws Error if called on an undirected graph
   */
  topologicalSort(): T[] | null {
    if (!this.directed) {
      throw new Error('Topological sort requires a directed graph');
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
   * Detects if the graph contains a cycle
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
   * Gets connected components in an undirected graph
   * @returns Array of connected components (each component is an array of vertices)
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
   * Clears all vertices and edges
   */
  clear(): void {
    this.adjacencyList.clear();
  }

  /**
   * Converts graph to adjacency matrix representation
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

// ============================================
// Utility Functions
// ============================================

/**
 * Validates and adds an edge using Effect Schema (for string graphs)
 *
 * @returns True if edge was added successfully
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
 * Validates a vertex ID using Effect Schema
 *
 * @returns True if valid
 */
export function isValidVertexId(id: unknown): id is string {
  const validation = validateSafe(VertexIdSchema, id);
  return validation.success;
}
