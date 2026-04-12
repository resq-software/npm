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
import { debounceFn } from './debounce.fn.js';

describe('debounce', () => {
  describe('debounceFn', () => {
    test('delays execution until after the delay', async () => {
      let callCount = 0;
      const fn = debounceFn(() => {
        callCount++;
      }, 30);

      fn();
      expect(callCount).toBe(0);

      await new Promise((r) => setTimeout(r, 60));
      expect(callCount).toBe(1);
    });

    test('resets timer on rapid calls — only last fires', async () => {
      const received: number[] = [];
      const fn = debounceFn((x: number) => {
        received.push(x);
      }, 30);

      fn(1);
      fn(2);
      fn(3);

      await new Promise((r) => setTimeout(r, 60));
      expect(received).toEqual([3]);
    });

    test('uses last arguments when executing', async () => {
      let result = '';
      const fn = debounceFn((s: string) => {
        result = s;
      }, 30);

      fn('first');
      fn('second');
      fn('last');

      await new Promise((r) => setTimeout(r, 60));
      expect(result).toBe('last');
    });

    test('allows multiple calls after delay expires', async () => {
      let callCount = 0;
      const fn = debounceFn(() => {
        callCount++;
      }, 20);

      fn();
      await new Promise((r) => setTimeout(r, 50));
      expect(callCount).toBe(1);

      fn();
      await new Promise((r) => setTimeout(r, 50));
      expect(callCount).toBe(2);
    });
  });
});
