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
import { afterFn } from './after.fn.js';

describe('after', () => {
  describe('afterFn', () => {
    test('calls the after function with args and response', async () => {
      let afterArgs: unknown;
      const fn = afterFn(
        (x: number) => x * 2,
        {
          func: (ctx: { args: unknown[]; response: unknown }) => {
            afterArgs = ctx;
          },
        },
      );

      const result = await fn(5);
      expect(result).toBe(10);
      expect(afterArgs).toBeDefined();
      expect((afterArgs as { args: unknown[] }).args).toEqual([5]);
      expect((afterArgs as { response: unknown }).response).toBe(10);
    });

    test('returns the original response', async () => {
      const fn = afterFn(
        (x: number) => x + 1,
        { func: () => {} },
      );

      expect(await fn(5)).toBe(6);
    });
  });
});
