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

/**
 * Sub-linear-memory frequency estimator.
 *
 * Estimates the number of times a string has been observed using
 * `O(width × depth)` memory regardless of the cardinality of the keyspace.
 * Estimates satisfy `estimate(x) ≥ trueCount(x)` and, with probability
 * `≥ 1 − delta`, `estimate(x) ≤ trueCount(x) + epsilon · totalCount`.
 *
 * Parameters:
 * - `width = ⌈ e / epsilon ⌉` (columns per row)
 * - `depth = ⌈ ln(1 / delta) ⌉`  (independent hash rows)
 *
 * Use cases: heavy-hitter detection, request-rate estimation, log-rollup
 * counts where exact counts are not affordable.
 *
 * @example
 * ```ts
 * const sketch = new CountMinSketch(0.001, 0.01); // ~2718 × 5
 * for (const ip of requests) sketch.increment(ip);
 * sketch.estimate("203.0.113.7"); // approximate count
 * ```
 */
export class CountMinSketch {
	readonly #table: Uint32Array[];
	readonly #width: number;
	readonly #depth: number;

	/**
	 * @param epsilon - Additive error bound, in `(0, 1)`. Smaller ⇒ more
	 *   memory, tighter estimates.
	 * @param delta - Probability that the error bound is exceeded, in
	 *   `(0, 1)`. Smaller ⇒ more rows.
	 *
	 * @throws RangeError if either parameter is outside `(0, 1)`.
	 */
	constructor(epsilon: number, delta: number) {
		if (epsilon <= 0 || epsilon >= 1) {
			throw new RangeError(`CountMinSketch: epsilon must be in (0, 1), got ${epsilon}`);
		}
		if (delta <= 0 || delta >= 1) {
			throw new RangeError(`CountMinSketch: delta must be in (0, 1), got ${delta}`);
		}
		this.#width = Math.ceil(Math.E / epsilon);
		this.#depth = Math.ceil(Math.log(1 / delta));
		this.#table = Array.from({ length: this.#depth }, () => new Uint32Array(this.#width));
	}

	#hash(key: string, seed: number): number {
		let h = (2166136261 ^ seed) >>> 0;
		for (let i = 0; i < key.length; i++) {
			h ^= key.charCodeAt(i);
			h = Math.imul(h, 16777619) >>> 0;
		}
		return h % this.#width;
	}

	/**
	 * Add `count` to the running tally for `key`.
	 *
	 * @param key - The item being counted.
	 * @param count - Increment amount; defaults to `1`. Negative counts are
	 *   permitted but break the upper-bound guarantee.
	 */
	increment(key: string, count = 1): void {
		for (let i = 0; i < this.#depth; i++) {
			const row = this.#table[i]!;
			const idx = this.#hash(key, (i * 0x9e3779b9) >>> 0);
			row[idx] = row[idx]! + count;
		}
	}

	/**
	 * @returns An over-estimate of the number of times `key` has been
	 *   incremented. Never returns less than the true count.
	 */
	estimate(key: string): number {
		let min = Infinity;
		for (let i = 0; i < this.#depth; i++) {
			const v = this.#table[i]![this.#hash(key, (i * 0x9e3779b9) >>> 0)]!;
			if (v < min) min = v;
		}
		return min === Infinity ? 0 : min;
	}
}
