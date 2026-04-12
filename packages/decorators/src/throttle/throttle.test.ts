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
import { throttleFn } from './throttle.fn.js';

describe('throttle', () => {
  describe('throttleFn', () => {
    test('executes first call immediately', () => {
      let callCount = 0;
      const fn = throttleFn(() => {
        callCount++;
      }, 1000);

      fn();
      expect(callCount).toBe(1);
    });

    test('drops subsequent calls within throttle window', () => {
      let callCount = 0;
      const fn = throttleFn(() => {
        callCount++;
      }, 1000);

      fn();
      fn();
      fn();
      expect(callCount).toBe(1);
    });

    test('allows call after throttle window expires', async () => {
      let callCount = 0;
      const fn = throttleFn(() => {
        callCount++;
      }, 30);

      fn();
      expect(callCount).toBe(1);

      await new Promise((r) => setTimeout(r, 60));
      fn();
      expect(callCount).toBe(2);
    });

    test('preserves arguments', () => {
      const received: number[] = [];
      const fn = throttleFn((x: number) => {
        received.push(x);
      }, 1000);

      fn(42);
      fn(99); // Should be dropped
      expect(received).toEqual([42]);
    });
  });
});
