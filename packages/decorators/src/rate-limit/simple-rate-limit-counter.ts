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

import type { RateLimitCounter } from './index.js';

/**
 * Simple in-memory implementation of RateLimitCounter.
 * Uses a Map to store counts for each key.
 *
 * @class SimpleRateLimitCounter
 * @implements {RateLimitCounter}
 *
 * @example
 * ```typescript
 * const counter = new SimpleRateLimitCounter();
 *
 * // Track API calls per user
 * counter.inc('user-1');
 * counter.inc('user-1');
 * counter.inc('user-2');
 *
 * console.log(counter.getCount('user-1')); // 2
 * console.log(counter.getCount('user-2')); // 1
 * console.log(counter.getCount('user-3')); // 0
 *
 * // After some time, decrement
 * counter.dec('user-1');
 * console.log(counter.getCount('user-1')); // 1
 * ```
 */
export class SimpleRateLimitCounter implements RateLimitCounter {
  /**
   * Creates a new SimpleRateLimitCounter instance.
   *
   * @param {Map<string, number>} [counterMap=new Map()] - Optional existing Map to use for storage
   */
  constructor(private readonly counterMap = new Map<string, number>()) {}

  /**
   * Gets the current count for a key.
   *
   * @param {string} key - The key to get count for
   * @returns {number} The current count (0 if key doesn't exist)
   *
   * @example
   * ```typescript
   * const counter = new SimpleRateLimitCounter();
   * console.log(counter.getCount('key')); // 0
   * counter.inc('key');
   * console.log(counter.getCount('key')); // 1
   * ```
   */
  getCount(key: string): number {
    return this.counterMap.get(key) ?? 0;
  }

  /**
   * Increments the count for a key.
   *
   * @param {string} key - The key to increment
   * @returns {void}
   *
   * @example
   * ```typescript
   * const counter = new SimpleRateLimitCounter();
   * counter.inc('user-123');
   * counter.inc('user-123');
   * console.log(counter.getCount('user-123')); // 2
   * ```
   */
  inc(key: string): void {
    if (!this.counterMap.has(key)) {
      this.counterMap.set(key, 0);
    }

    this.counterMap.set(key, (this.counterMap.get(key) ?? 0) + 1);
  }

  /**
   * Decrements the count for a key.
   * Removes the key from the map if count reaches 0.
   *
   * @param {string} key - The key to decrement
   * @returns {void}
   *
   * @example
   * ```typescript
   * const counter = new SimpleRateLimitCounter();
   * counter.inc('key');
   * counter.inc('key');
   * counter.dec('key');
   * console.log(counter.getCount('key')); // 1
   * counter.dec('key');
   * console.log(counter.getCount('key')); // 0 (key removed from map)
   * ```
   */
  dec(key: string): void {
    const currentCount = this.counterMap.get(key);

    if (currentCount !== undefined) {
      if (currentCount <= 1) {
        this.counterMap.delete(key);
      } else {
        this.counterMap.set(key, currentCount - 1);
      }
    }
  }
}
