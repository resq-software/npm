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
import { beforeFn } from './before.fn.js';

describe('before', () => {
  describe('beforeFn', () => {
    test('calls the before function before the original', async () => {
      const order: string[] = [];
      const fn = beforeFn(
        () => {
          order.push('original');
          return 'result';
        },
        {
          func: () => {
            order.push('before');
          },
        },
      );

      const result = await fn();
      expect(order).toEqual(['before', 'original']);
      expect(result).toBe('result');
    });

    test('original return value is preserved', async () => {
      const fn = beforeFn(
        (x: number) => x * 2,
        { func: () => {} },
      );

      expect(await fn(5)).toBe(10);
    });
  });
});
