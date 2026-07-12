/**
 * Copyright 2026 ResQ Systems, Inc.
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

import type { Probability } from "./schemas.js";

/** Default target false-positive rate (1%) used when none is supplied. */
const DEFAULT_ERROR_RATE = 0.01;

/**
 * Space-efficient probabilistic set membership test.
 *
 * `has(x)` is guaranteed to return `true` for any item that was added; for
 * items that were *not* added it returns `true` with probability ≤ the
 * configured `errorRate` (false positives) and `false` otherwise (no false
 * negatives).
 *
 * Bit array size `m` and hash count `k` are derived from `capacity` and
 * `errorRate` using the standard formulas:
 *
 * - `m = ⌈ -n · ln(p) / (ln 2)² ⌉`
 * - `k = max(1, round((m / n) · ln 2))`
 *
 * Hashing uses double FNV-1a with per-call seeds — no allocation per
 * `add`/`has` call.
 *
 * @example
 * ```ts
 * const seen = new BloomFilter(100_000, 0.001); // 0.1% false-positive rate
 * seen.add("drone-04");
 * seen.has("drone-04"); // → true
 * seen.has("drone-99"); // → false (with high probability)
 * ```
 */
export class BloomFilter {
	readonly #bits: Uint8Array;
	readonly #k: number;
	readonly #m: number;

	/**
	 * @param capacity - Expected number of distinct items to insert. Memory
	 *   use grows linearly with this value.
	 * @param errorRate - Target false-positive rate as a branded
	 *   {@link Probability} in `(0, 1)`. Omit to use the default `0.01` (1%).
	 *   Construct one with `toProbability(...)` so an out-of-range value is
	 *   rejected at the type level; the runtime check below still guards
	 *   untrusted callers that reach this boundary via a cast.
	 *
	 * @throws RangeError if `capacity <= 0` or `errorRate` is outside `(0, 1)`.
	 */
	constructor(capacity: number, errorRate?: Probability) {
		const rate: number = errorRate ?? DEFAULT_ERROR_RATE;
		if (rate <= 0 || rate >= 1) {
			throw new RangeError(`BloomFilter: errorRate must be in (0, 1), got ${rate}`);
		}
		if (capacity <= 0) {
			throw new RangeError(`BloomFilter: capacity must be > 0, got ${capacity}`);
		}
		const m = Math.ceil((-capacity * Math.log(rate)) / Math.LN2 ** 2);
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

	/**
	 * Mark `item` as present. Subsequent `has(item)` calls always return
	 * `true`. Adding an item already present is a no-op.
	 */
	add(item: string): void {
		for (let i = 0; i < this.#k; i++) {
			const idx = this.#hash(item, (i * 0x9e3779b9) >>> 0);
			this.#bits[idx >> 3]! |= 1 << (idx & 7);
		}
	}

	/**
	 * Probabilistic membership test.
	 *
	 * @returns `false` ⇒ the item was definitely never added.
	 *          `true`  ⇒ the item was probably added (false-positive rate
	 *          bounded by the constructor's `errorRate`).
	 */
	has(item: string): boolean {
		for (let i = 0; i < this.#k; i++) {
			const idx = this.#hash(item, (i * 0x9e3779b9) >>> 0);
			if (!(this.#bits[idx >> 3]! & (1 << (idx & 7)))) return false;
		}
		return true;
	}
}
