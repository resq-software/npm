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
import { Queue } from '../src/queue.js';

describe('Queue', () => {
  // --- Construction ---

  it('creates an empty queue', () => {
    const q = new Queue<number>();
    expect(q.getSize()).toBe(0);
    expect(q.isEmpty()).toBe(true);
  });

  // --- enqueue ---

  it('enqueue() adds an item and increases size', () => {
    const q = new Queue<string>();
    q.enqueue('first');
    expect(q.getSize()).toBe(1);
    expect(q.isEmpty()).toBe(false);
  });

  it('enqueue() adds multiple items', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    expect(q.getSize()).toBe(3);
  });

  // --- dequeue ---

  it('dequeue() removes and returns the first item', () => {
    const q = new Queue<string>();
    q.enqueue('a');
    q.enqueue('b');
    expect(q.dequeue()).toBe('a');
    expect(q.getSize()).toBe(1);
  });

  it('dequeue() returns null on an empty queue', () => {
    const q = new Queue<number>();
    expect(q.dequeue()).toBeNull();
  });

  it('dequeue() returns null after all items are removed', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.dequeue();
    expect(q.dequeue()).toBeNull();
    expect(q.isEmpty()).toBe(true);
  });

  // --- FIFO ordering ---

  it('maintains FIFO order', () => {
    const q = new Queue<number>();
    q.enqueue(10);
    q.enqueue(20);
    q.enqueue(30);
    expect(q.dequeue()).toBe(10);
    expect(q.dequeue()).toBe(20);
    expect(q.dequeue()).toBe(30);
  });

  it('interleaved enqueue and dequeue preserves FIFO', () => {
    const q = new Queue<string>();
    q.enqueue('a');
    q.enqueue('b');
    expect(q.dequeue()).toBe('a');
    q.enqueue('c');
    expect(q.dequeue()).toBe('b');
    expect(q.dequeue()).toBe('c');
  });

  // --- isEmpty ---

  it('isEmpty() returns true for a new queue', () => {
    const q = new Queue<number>();
    expect(q.isEmpty()).toBe(true);
  });

  it('isEmpty() returns false after enqueue', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    expect(q.isEmpty()).toBe(false);
  });

  it('isEmpty() returns true after all items are dequeued', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    q.dequeue();
    q.dequeue();
    expect(q.isEmpty()).toBe(true);
  });

  // --- getSize ---

  it('getSize() reflects enqueue operations', () => {
    const q = new Queue<number>();
    expect(q.getSize()).toBe(0);
    q.enqueue(1);
    expect(q.getSize()).toBe(1);
    q.enqueue(2);
    expect(q.getSize()).toBe(2);
  });

  it('getSize() reflects dequeue operations', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    q.dequeue();
    expect(q.getSize()).toBe(1);
  });

  it('getSize() does not go below zero', () => {
    const q = new Queue<number>();
    q.dequeue();
    q.dequeue();
    expect(q.getSize()).toBe(0);
  });

  // --- Edge cases ---

  it('handles a large number of items', () => {
    const q = new Queue<number>();
    const count = 10_000;
    for (let i = 0; i < count; i++) {
      q.enqueue(i);
    }
    expect(q.getSize()).toBe(count);
    for (let i = 0; i < count; i++) {
      expect(q.dequeue()).toBe(i);
    }
    expect(q.isEmpty()).toBe(true);
  });

  it('supports different value types', () => {
    const q = new Queue<{ id: number; name: string }>();
    const obj = { id: 1, name: 'test' };
    q.enqueue(obj);
    expect(q.dequeue()).toBe(obj);
  });

  it('enqueue after full drain works correctly', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.dequeue();
    q.enqueue(2);
    expect(q.getSize()).toBe(1);
    expect(q.dequeue()).toBe(2);
  });

  it('handles null and undefined values', () => {
    const q = new Queue<null | undefined>();
    q.enqueue(null);
    q.enqueue(undefined);
    expect(q.getSize()).toBe(2);
    expect(q.dequeue()).toBeNull();
    expect(q.dequeue()).toBeUndefined();
  });

  it('single item enqueue and dequeue cycle', () => {
    const q = new Queue<string>();
    for (let i = 0; i < 100; i++) {
      q.enqueue(`item-${i}`);
      expect(q.dequeue()).toBe(`item-${i}`);
      expect(q.isEmpty()).toBe(true);
    }
  });
});
