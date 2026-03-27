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

import { describe, expect, it } from 'vitest';
import { BoundedHeap } from '../src/heap.js';

describe('BoundedHeap', () => {
  it('keeps the K nearest (smallest distance) entries', () => {
    const heap = new BoundedHeap<{ id: string; distance: number }>(3);
    heap.insert({ id: 'a', distance: 10 });
    heap.insert({ id: 'b', distance: 2 });
    heap.insert({ id: 'c', distance: 7 });
    heap.insert({ id: 'd', distance: 1 }); // evicts 'a' (dist 10)
    heap.insert({ id: 'e', distance: 50 }); // rejected — larger than root

    expect(heap.size).toBe(3);
    const sorted = heap.toSorted();
    expect(sorted.map((x) => x.id)).toEqual(['d', 'b', 'c']); // ascending distance
  });

  it('peek returns the current maximum', () => {
    const heap = new BoundedHeap<{ id: string; distance: number }>(2);
    heap.insert({ id: 'x', distance: 5 });
    heap.insert({ id: 'y', distance: 3 });
    expect(heap.peek()?.id).toBe('x'); // max-heap root = largest distance
  });

  it('handles limit=1', () => {
    const heap = new BoundedHeap<{ id: string; distance: number }>(1);
    heap.insert({ id: 'a', distance: 9 });
    heap.insert({ id: 'b', distance: 3 });
    expect(heap.size).toBe(1);
    expect(heap.peek()?.id).toBe('b');
  });
});
