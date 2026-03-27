/**
 * Copyright 2026 ResQ Software
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

export class BloomFilter {
  readonly #bits: Uint8Array;
  readonly #k: number;
  readonly #m: number;

  constructor(capacity: number, errorRate = 0.01) {
    if (errorRate <= 0 || errorRate >= 1) {
      throw new RangeError(`BloomFilter: errorRate must be in (0, 1), got ${errorRate}`);
    }
    if (capacity <= 0) {
      throw new RangeError(`BloomFilter: capacity must be > 0, got ${capacity}`);
    }
    const m = Math.ceil(-capacity * Math.log(errorRate) / Math.LN2 ** 2);
    const k = Math.max(1, Math.round((m / capacity) * Math.LN2));
    this.#m = m;
    this.#k = k;
    this.#bits = new Uint8Array(Math.ceil(m / 8));
  }

  #hash(item: string, seed: number): number {
    let h = (2166136261 ^ seed) >>> 0;
    for (let i = 0; i < item.length; i++) {
      h ^= item.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h % this.#m;
  }

  add(item: string): void {
    for (let i = 0; i < this.#k; i++) {
      const idx = this.#hash(item, (i * 0x9e3779b9) >>> 0);
      this.#bits[idx >> 3]! |= 1 << (idx & 7);
    }
  }

  has(item: string): boolean {
    for (let i = 0; i < this.#k; i++) {
      const idx = this.#hash(item, (i * 0x9e3779b9) >>> 0);
      if (!(this.#bits[idx >> 3]! & (1 << (idx & 7)))) return false;
    }
    return true;
  }
}
