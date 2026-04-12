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
import { memoizeFn } from './memoize.fn.js';

describe('memoize', () => {
  describe('memoizeFn', () => {
    test('caches result for same arguments', () => {
      let callCount = 0;
      const fn = memoizeFn((x: number) => {
        callCount++;
        return x * 2;
      });

      expect(fn(5)).toBe(10);
      expect(fn(5)).toBe(10);
      expect(callCount).toBe(1);
    });

    test('computes separately for different arguments', () => {
      let callCount = 0;
      const fn = memoizeFn((x: number) => {
        callCount++;
        return x * 2;
      });

      expect(fn(5)).toBe(10);
      expect(fn(10)).toBe(20);
      expect(callCount).toBe(2);
    });

    test('uses JSON.stringify as default key', () => {
      let callCount = 0;
      const fn = memoizeFn((a: number, b: number) => {
        callCount++;
        return a + b;
      });

      expect(fn(1, 2)).toBe(3);
      expect(fn(1, 2)).toBe(3);
      expect(callCount).toBe(1);

      expect(fn(2, 1)).toBe(3);
      expect(callCount).toBe(2);
    });

    test('supports custom keyResolver', () => {
      let callCount = 0;
      const fn = memoizeFn(
        (obj: { id: number; name: string }) => {
          callCount++;
          return obj.name.toUpperCase();
        },
        { keyResolver: (obj: { id: number }) => String(obj.id) },
      );

      expect(fn({ id: 1, name: 'alice' })).toBe('ALICE');
      expect(fn({ id: 1, name: 'bob' })).toBe('ALICE'); // Same id → cached
      expect(callCount).toBe(1);
    });

    test('supports custom cache map', () => {
      const customCache = new Map<string, unknown>();
      const fn = memoizeFn(
        (x: number) => x * 3,
        { cache: customCache },
      );

      fn(7);
      expect(customCache.size).toBe(1);
    });
  });
});
