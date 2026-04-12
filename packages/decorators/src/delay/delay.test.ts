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
import { delayFn } from './delay.fn.js';

describe('delay', () => {
  describe('delayFn', () => {
    test('delays execution by the specified time', async () => {
      let called = false;
      const fn = delayFn(() => {
        called = true;
      }, 30);

      fn();
      expect(called).toBe(false);

      await new Promise((r) => setTimeout(r, 60));
      expect(called).toBe(true);
    });

    test('preserves arguments', async () => {
      let received: number | undefined;
      const fn = delayFn((x: number) => {
        received = x;
      }, 20);

      fn(42);
      await new Promise((r) => setTimeout(r, 50));
      expect(received).toBe(42);
    });

    test('multiple calls each schedule independently', async () => {
      let callCount = 0;
      const fn = delayFn(() => {
        callCount++;
      }, 20);

      fn();
      fn();
      fn();

      await new Promise((r) => setTimeout(r, 60));
      expect(callCount).toBe(3);
    });
  });
});
