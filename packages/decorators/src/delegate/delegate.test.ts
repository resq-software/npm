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
import { delegateFn } from './delegate.fn.js';

describe('delegate', () => {
  describe('delegateFn', () => {
    test('deduplicates concurrent calls with same args', async () => {
      let callCount = 0;
      const fn = delegateFn(async (x: number) => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return x * 2;
      });

      const [a, b] = await Promise.all([fn(5), fn(5)]);
      expect(a).toBe(10);
      expect(b).toBe(10);
      expect(callCount).toBe(1);
    });

    test('concurrent calls with different args are independent', async () => {
      let callCount = 0;
      const fn = delegateFn(async (x: number) => {
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        return x * 2;
      });

      const [a, b] = await Promise.all([fn(5), fn(10)]);
      expect(a).toBe(10);
      expect(b).toBe(20);
      expect(callCount).toBe(2);
    });

    test('cleans up after promise resolves — new call creates new promise', async () => {
      let callCount = 0;
      const fn = delegateFn(async (x: number) => {
        callCount++;
        return x * 2;
      });

      const a = await fn(5);
      const b = await fn(5);
      expect(a).toBe(10);
      expect(b).toBe(10);
      expect(callCount).toBe(2);
    });

    test('supports custom keyResolver', async () => {
      let callCount = 0;
      const fn = delegateFn(
        async (obj: { id: number; ts: number }) => {
          callCount++;
          await new Promise((r) => setTimeout(r, 50));
          return obj.id;
        },
        (obj: { id: number }) => String(obj.id),
      );

      const [a, b] = await Promise.all([
        fn({ id: 1, ts: 100 }),
        fn({ id: 1, ts: 200 }),
      ]);
      expect(a).toBe(1);
      expect(b).toBe(1);
      expect(callCount).toBe(1);
    });
  });
});
