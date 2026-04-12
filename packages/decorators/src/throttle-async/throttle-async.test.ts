/**
 * Copyright 2026 ResQ
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

import { describe, expect, test } from 'vitest';
import { throttleAsyncFn } from './throttle-async.fn.js';

describe('throttleAsync', () => {
  describe('throttleAsyncFn', () => {
    test('limits concurrent executions to parallelCalls', async () => {
      let running = 0;
      let maxRunning = 0;

      const fn = throttleAsyncFn(
        async (x: number) => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          await new Promise((r) => setTimeout(r, 50));
          running--;
          return x * 2;
        },
        2,
      );

      const results = await Promise.all([fn(1), fn(2), fn(3), fn(4)]);
      expect(results).toEqual([2, 4, 6, 8]);
      expect(maxRunning).toBeLessThanOrEqual(2);
    });

    test('defaults to 1 parallel call (sequential)', async () => {
      let running = 0;
      let maxRunning = 0;

      const fn = throttleAsyncFn(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 20));
        running--;
        return 'ok';
      });

      await Promise.all([fn(), fn(), fn()]);
      expect(maxRunning).toBe(1);
    });

    test('queued calls execute in FIFO order', async () => {
      const order: number[] = [];

      const fn = throttleAsyncFn(
        async (x: number) => {
          await new Promise((r) => setTimeout(r, 10));
          order.push(x);
          return x;
        },
        1,
      );

      await Promise.all([fn(1), fn(2), fn(3)]);
      expect(order).toEqual([1, 2, 3]);
    });

    test('handles rejections without blocking the queue', async () => {
      let callCount = 0;

      const fn = throttleAsyncFn(
        async (shouldFail: boolean) => {
          callCount++;
          if (shouldFail) throw new Error('intentional');
          return 'ok';
        },
        1,
      );

      const results = await Promise.allSettled([fn(true), fn(false), fn(false)]);
      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
      expect(callCount).toBe(3);
    });
  });
});
