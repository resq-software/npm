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

import { describe, it, expect } from 'vitest';
import {
  measurePerformance,
  domainMatchesAny,
  type AlgorithmCandidate,
  type BigONotation,
} from './measure.js';
import { BloomFilter } from '../../src/bloom.js';
import { CountMinSketch } from '../../src/count-min.js';
import { BoundedHeap } from '../../src/heap.js';
import { Graph } from '../../src/graph.js';
import { Trie } from '../../src/trie.js';
import { createMinHeap } from '../../src/priority-queue.js';

/**
 * Asserts that at least one estimated domain matches an expected Big-O notation.
 * On failure the message includes both the expected and actual domain descriptions.
 */
const expectComplexityIn = (
  domains: Awaited<ReturnType<typeof measurePerformance>>[string],
  expected: BigONotation[],
) => {
  const descriptions = domains.estimatedDomains.map(
    (d) => `${d.scientificNotation} (${d.description})`,
  );
  expect(
    domainMatchesAny(domains.estimatedDomains, expected),
    `Expected one of [${expected.join(', ')}] but got [${descriptions.join(', ')}]`,
  ).toBe(true);
};

describe('Algorithmic Complexity Verification', () => {
  it('BloomFilter.add should be O(1) amortized — O(n) total for n operations', async () => {
    const algo: AlgorithmCandidate = {
      name: 'BloomFilter.add',
      fn: async (size) => {
        const bf = new BloomFilter(size * 10, 0.01);
        for (let i = 0; i < size; i++) {
          bf.add(`item-${i}`);
        }
      },
    };
    const results = await measurePerformance(algo);
    // O(1) per operation => O(n) total for the loop
    expectComplexityIn(results['BloomFilter.add'], ['O(1)', 'O(log n)', 'O(n)']);
  });

  it('BoundedHeap.insert should be O(log n) per op — O(n log n) total', async () => {
    const algo: AlgorithmCandidate = {
      name: 'BoundedHeap.insert',
      fn: async (size) => {
        const heap = new BoundedHeap<{ distance: number }>(size);
        for (let i = 0; i < size; i++) {
          heap.insert({ distance: Math.random() });
        }
      },
    };
    const results = await measurePerformance(algo);
    expectComplexityIn(results['BoundedHeap.insert'], ['O(n)', 'O(n log n)', 'O(log n)']);
  });

  it('Graph.findShortestPath (Dijkstra) should be O(E log V)', async () => {
    const algo: AlgorithmCandidate = {
      name: 'Graph.dijkstra',
      fn: async (size) => {
        const g = new Graph<string>();
        // Build a chain graph: "0" -> "1" -> ... -> "size"
        for (let i = 0; i < size; i++) {
          g.addEdge(String(i), String(i + 1), Math.random() * 10 + 1);
        }
        g.findShortestPath('0', String(size));
      },
    };
    const results = await measurePerformance(algo);
    // Chain graph: E = V-1, so O(V log V) ~ loglinear or linear
    expectComplexityIn(results['Graph.dijkstra'], ['O(n)', 'O(n log n)']);
  });

  it('Trie.insert should be O(L) per key — O(n*L) total for n fixed-length keys', async () => {
    const algo: AlgorithmCandidate = {
      name: 'Trie.insert',
      fn: async (size) => {
        const trie = new Trie<number>();
        for (let i = 0; i < size; i++) {
          trie.insert(`key-${i.toString().padStart(8, '0')}`, i);
        }
      },
    };
    const results = await measurePerformance(algo);
    // Fixed key length => O(n) total
    expectComplexityIn(results['Trie.insert'], ['O(n)', 'O(n log n)']);
  });

  it('CountMinSketch.increment should be O(1) amortized — O(n) total', async () => {
    const algo: AlgorithmCandidate = {
      name: 'CountMinSketch.increment',
      fn: async (size) => {
        const cms = new CountMinSketch(0.01, 0.01);
        for (let i = 0; i < size; i++) {
          cms.increment(`item-${i}`, 1);
        }
      },
    };
    const results = await measurePerformance(algo);
    expectComplexityIn(results['CountMinSketch.increment'], ['O(1)', 'O(log n)', 'O(n)']);
  });

  it('PriorityQueue enqueue+dequeue cycle should be O(n log n) total', async () => {
    const algo: AlgorithmCandidate = {
      name: 'PriorityQueue',
      fn: async (size) => {
        const pq = createMinHeap<number>();
        for (let i = 0; i < size; i++) {
          pq.enqueue(Math.random());
        }
        while (pq.size > 0) {
          pq.dequeue();
        }
      },
    };
    const results = await measurePerformance(algo);
    expectComplexityIn(results['PriorityQueue'], ['O(n)', 'O(n log n)']);
  });
});
