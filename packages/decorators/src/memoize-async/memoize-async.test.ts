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
import { memoizeAsyncFn } from './memoize-async.fn.js';

describe('memoizeAsync', () => {
  describe('memoizeAsyncFn', () => {
    test('caches result for same arguments', async () => {
      let callCount = 0;
      const fn = memoizeAsyncFn(async (x: number) => {
        callCount++;
        return x * 2;
      });

      expect(await fn(5)).toBe(10);
      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(1);
    });

    test('computes separately for different arguments', async () => {
      let callCount = 0;
      const fn = memoizeAsyncFn(async (x: number) => {
        callCount++;
        return x * 2;
      });

      expect(await fn(5)).toBe(10);
      expect(await fn(10)).toBe(20);
      expect(callCount).toBe(2);
    });

    test('deduplicates concurrent calls with same args', async () => {
      let callCount = 0;
      const fn = memoizeAsyncFn(async (x: number) => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return x * 2;
      });

      const [a, b] = await Promise.all([fn(5), fn(5)]);
      expect(a).toBe(10);
      expect(b).toBe(10);
      expect(callCount).toBe(1);
    });

    test('supports custom keyResolver', async () => {
      let callCount = 0;
      const fn = memoizeAsyncFn(
        async (obj: { id: number; name: string }) => {
          callCount++;
          return obj.name.toUpperCase();
        },
        { keyResolver: (obj: { id: number }) => String(obj.id) },
      );

      expect(await fn({ id: 1, name: 'alice' })).toBe('ALICE');
      expect(await fn({ id: 1, name: 'bob' })).toBe('ALICE');
      expect(callCount).toBe(1);
    });
  });
});
