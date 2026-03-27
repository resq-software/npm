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

import { beforeEach, describe, expect, it } from 'vitest';
import { Graph, addValidatedEdge, isValidVertexId } from '../src/graph.js';

describe('Graph', () => {
  let graph: Graph<string>;

  beforeEach(() => {
    graph = new Graph<string>();
  });

  describe('constructor', () => {
    it('creates an empty directed graph by default', () => {
      expect(graph.vertexCount).toBe(0);
      expect(graph.edgeCount).toBe(0);
    });

    it('creates undirected graph when specified', () => {
      const undirected = new Graph<string>({ directed: false });
      expect(undirected).toBeInstanceOf(Graph);
    });
  });

  describe('addVertex', () => {
    it('adds a vertex', () => {
      graph.addVertex('A');
      expect(graph.vertexCount).toBe(1);
      expect(graph.hasVertex('A')).toBe(true);
    });

    it('does not add duplicate vertices', () => {
      graph.addVertex('A');
      graph.addVertex('A');
      expect(graph.vertexCount).toBe(1);
    });

    it('supports method chaining', () => {
      const result = graph.addVertex('A').addVertex('B');
      expect(result).toBe(graph);
      expect(graph.vertexCount).toBe(2);
    });

    it('stores vertex metadata', () => {
      graph.addVertex('A', { level: 'top', score: 42 });
      expect(graph.getVertexMetadata('A')?.level).toBe('top');
    });
  });

  describe('addVertices', () => {
    it('adds multiple vertices at once', () => {
      graph.addVertices(['A', 'B', 'C', 'D']);
      expect(graph.vertexCount).toBe(4);
    });
  });

  describe('addEdge', () => {
    it('adds an edge and auto-creates vertices', () => {
      graph.addEdge('A', 'B');
      expect(graph.hasEdge('A', 'B')).toBe(true);
      expect(graph.hasVertex('A')).toBe(true);
      expect(graph.hasVertex('B')).toBe(true);
      expect(graph.edgeCount).toBe(1);
    });

    it('stores edge weight', () => {
      graph.addEdge('A', 'B', 5);
      expect(graph.getNeighbors('A')[0]?.weight).toBe(5);
    });

    it('updates edge weight for existing edge', () => {
      graph.addEdge('A', 'B', 5);
      graph.addEdge('A', 'B', 10);
      expect(graph.getNeighbors('A')[0]?.weight).toBe(10);
    });

    it('adds bidirectional edges for undirected graph', () => {
      const undirected = new Graph<string>({ directed: false });
      undirected.addEdge('A', 'B');
      expect(undirected.hasEdge('A', 'B')).toBe(true);
      expect(undirected.hasEdge('B', 'A')).toBe(true);
    });
  });

  describe('removeVertex', () => {
    beforeEach(() => {
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('B', 'C');
    });

    it('removes vertex and all incident edges', () => {
      expect(graph.removeVertex('B')).toBe(true);
      expect(graph.hasVertex('B')).toBe(false);
      expect(graph.hasEdge('A', 'B')).toBe(false);
    });

    it('returns false for non-existent vertex', () => {
      expect(graph.removeVertex('Z')).toBe(false);
    });
  });

  describe('removeEdge', () => {
    it('removes an edge', () => {
      graph.addEdge('A', 'B');
      expect(graph.removeEdge('A', 'B')).toBe(true);
      expect(graph.hasEdge('A', 'B')).toBe(false);
    });

    it('returns false for non-existent edge', () => {
      graph.addEdge('A', 'B');
      expect(graph.removeEdge('A', 'Z')).toBe(false);
    });
  });

  describe('getNeighbors', () => {
    it('returns edges for a vertex', () => {
      graph.addEdge('A', 'B', 1);
      graph.addEdge('A', 'C', 2);
      expect(graph.getNeighbors('A').length).toBe(2);
    });

    it('returns empty array for unknown vertex', () => {
      expect(graph.getNeighbors('Z').length).toBe(0);
    });
  });

  describe('bfs', () => {
    beforeEach(() => {
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('B', 'D');
      graph.addEdge('C', 'E');
    });

    it('visits all reachable vertices in BFS order', () => {
      const result = graph.bfs('A');
      expect(result.vertices[0]).toBe('A');
      expect(result.vertices).toContain('B');
      expect(result.vertices).toContain('C');
      expect(result.vertices).toContain('D');
      expect(result.vertices).toContain('E');
    });

    it('tracks distances from source', () => {
      const result = graph.bfs('A');
      expect(result.distances.get('A')).toBe(0);
      expect(result.distances.get('B')).toBe(1);
      expect(result.distances.get('D')).toBe(2);
    });

    it('tracks parent relationships', () => {
      const result = graph.bfs('A');
      expect(result.parents.get('A')).toBeNull();
      expect(result.parents.get('B')).toBe('A');
    });

    it('returns empty result for non-existent start', () => {
      const result = graph.bfs('Z');
      expect(result.vertices.length).toBe(0);
    });
  });

  describe('dfs', () => {
    beforeEach(() => {
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('B', 'D');
    });

    it('visits all reachable vertices', () => {
      const result = graph.dfs('A');
      expect(result.vertices[0]).toBe('A');
      expect(result.vertices).toContain('B');
      expect(result.vertices).toContain('C');
      expect(result.vertices).toContain('D');
    });

    it('tracks parent of root as null', () => {
      const result = graph.dfs('A');
      expect(result.parents.get('A')).toBeNull();
    });

    it('returns empty result for non-existent start', () => {
      const result = graph.dfs('Z');
      expect(result.vertices.length).toBe(0);
    });
  });

  describe('findShortestPath', () => {
    beforeEach(() => {
      graph.addEdge('A', 'B', 1);
      graph.addEdge('A', 'C', 4);
      graph.addEdge('B', 'C', 2);
      graph.addEdge('C', 'D', 1);
    });

    it('finds the shortest weighted path', () => {
      const result = graph.findShortestPath('A', 'D');
      expect(result.found).toBe(true);
      expect(result.path).toEqual(['A', 'B', 'C', 'D']);
      expect(result.distance).toBe(4);
    });

    it('returns distance 0 for path to self', () => {
      const result = graph.findShortestPath('A', 'A');
      expect(result.found).toBe(true);
      expect(result.distance).toBe(0);
    });

    it('returns found=false for unreachable vertex', () => {
      graph.addVertex('Isolated');
      const result = graph.findShortestPath('A', 'Isolated');
      expect(result.found).toBe(false);
    });

    it('returns found=false for missing vertex', () => {
      const result = graph.findShortestPath('A', 'Z');
      expect(result.found).toBe(false);
    });

    it('prefers cheaper path over shorter hop count', () => {
      const result = graph.findShortestPath('A', 'C');
      expect(result.distance).toBe(3); // A->B->C=3, A->C=4
    });
  });

  describe('astar', () => {
    it('finds path using heuristic', () => {
      const g = new Graph<number>();
      g.addEdge(0, 1, 1);
      g.addEdge(1, 2, 1);
      g.addEdge(0, 3, 10);
      g.addEdge(3, 2, 1);
      const result = g.astar(0, 2, (a, b) => Math.abs(a - b));
      expect(result?.path).toEqual([0, 1, 2]);
      expect(result?.cost).toBe(2);
    });

    it('returns null for unreachable target', () => {
      const g = new Graph<number>();
      g.addVertex(0);
      g.addVertex(1);
      expect(g.astar(0, 1, () => 0)).toBeNull();
    });
  });

  describe('topologicalSort', () => {
    it('returns vertices in topological order', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('B', 'D');
      graph.addEdge('C', 'D');
      const order = graph.topologicalSort();
      expect(order).not.toBeNull();
      expect(order!.indexOf('A')).toBeLessThan(order!.indexOf('B'));
      expect(order!.indexOf('B')).toBeLessThan(order!.indexOf('D'));
    });

    it('returns null when a cycle exists', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');
      expect(graph.topologicalSort()).toBeNull();
    });

    it('throws for undirected graph', () => {
      const undirected = new Graph<string>({ directed: false });
      undirected.addEdge('A', 'B');
      expect(() => undirected.topologicalSort()).toThrow();
    });
  });

  describe('hasCycle', () => {
    it('detects cycle in directed graph', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');
      expect(graph.hasCycle()).toBe(true);
    });

    it('returns false for DAG', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'C');
      graph.addEdge('B', 'D');
      expect(graph.hasCycle()).toBe(false);
    });
  });

  describe('getConnectedComponents', () => {
    it('finds all connected components', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('C', 'D');
      graph.addVertex('E');
      const components = graph.getConnectedComponents();
      expect(components.length).toBe(3);
    });
  });

  describe('clear', () => {
    it('removes all vertices and edges', () => {
      graph.addEdge('A', 'B');
      graph.clear();
      expect(graph.vertexCount).toBe(0);
    });
  });

  describe('toAdjacencyMatrix', () => {
    it('returns matrix representation', () => {
      graph.addEdge('A', 'B', 2);
      const { vertices, matrix } = graph.toAdjacencyMatrix();
      const aIdx = vertices.indexOf('A');
      const bIdx = vertices.indexOf('B');
      expect(matrix[aIdx]![bIdx]).toBe(2);
      expect(matrix[aIdx]![aIdx]).toBe(0);
    });
  });
});

describe('isValidVertexId', () => {
  it('returns true for non-empty strings', () => {
    expect(isValidVertexId('A')).toBe(true);
    expect(isValidVertexId('node-01')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidVertexId('')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isValidVertexId(null)).toBe(false);
    expect(isValidVertexId(undefined)).toBe(false);
    expect(isValidVertexId(42 as unknown as string)).toBe(false);
  });
});

describe('addValidatedEdge', () => {
  it('adds a validated edge', () => {
    const g = new Graph<string>();
    expect(addValidatedEdge(g, 'A', 'B', 1)).toBe(true);
    expect(g.hasEdge('A', 'B')).toBe(true);
  });

  it('rejects empty source', () => {
    const g = new Graph<string>();
    expect(addValidatedEdge(g, '', 'B', 1)).toBe(false);
  });

  it('rejects empty target', () => {
    const g = new Graph<string>();
    expect(addValidatedEdge(g, 'A', '', 1)).toBe(false);
  });
});
