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
 * @fileoverview Standalone numeric helpers used alongside the expression engine —
 * interpolation, range remapping, and a seeded PRNG. Independent of the AST so
 * they stay tree-shakeable.
 *
 * @module @resq-systems/math/utils
 */

/**
 * Linearly interpolate between two values.
 *
 * @param a - Start value, returned when `t` is `0`.
 * @param b - End value, returned when `t` is `1`.
 * @param t - Interpolation factor, typically in `[0, 1]` but not clamped.
 * @returns The value `t` of the way from `a` to `b`.
 * @example
 * ```ts
 * lerp(0, 10, 0.5); // → 5
 * ```
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Inverse of {@link lerp}: map a value in `[a, b]` back to its `[0, 1]` factor.
 *
 * Returns `0` for a degenerate range (`a === b`) rather than dividing by zero.
 *
 * @param a - Range start.
 * @param b - Range end.
 * @param t - The value to locate within `[a, b]`.
 * @returns The interpolation factor, or `0` when the range has zero width.
 * @example
 * ```ts
 * invLerp(0, 10, 5); // → 0.5
 * ```
 * @see {@link lerp}
 */
export function invLerp(a: number, b: number, t: number): number {
	if (b - a === 0) return 0;
	return (t - a) / (b - a);
}

/**
 * Create a seeded pseudo-random number generator using xorshift.
 *
 * The same seed always yields the same sequence, which makes it suitable for
 * reproducible tests and deterministic sampling. Each call to the returned
 * function produces a value in `[-1, 1)`. Adapted from seedrandom.
 *
 * `rng` itself is pure. The **returned** generator is stateful: it holds mutable
 * internal state and advances it on every call, so calls are order-dependent and
 * one generator cannot back two independent streams — mint a separate generator
 * per stream.
 *
 * @param seed - Seed string; the empty default still produces a stable sequence.
 * @returns A stateful generator that returns the next number on each call.
 * @example
 * ```ts
 * const next = rng("seed");
 * next(); // → deterministic value in [-1, 1)
 * ```
 */
export function rng(seed = ""): () => number {
	let x = 0;
	let y = 0;
	let z = 0;
	let w = 0;

	function next() {
		const t = x ^ (x << 11);
		x = y;
		y = z;
		z = w;
		w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0;
		return (w / 0x100000000) * 2;
	}

	for (let k = 0; k < seed.length + 64; k++) {
		x ^= seed.charCodeAt(k) | 0;
		next();
	}

	return next;
}

/**
 * Remap a value from an input range onto an output range.
 *
 * Handles a degenerate input range (equal endpoints) by returning the output
 * low bound, and can optionally clamp the result to the output range regardless
 * of its direction.
 *
 * @param value - The value to remap, expressed in the input range.
 * @param rangeA - Input range as a two-element `[low, high]` array; only indices 0 and 1 are read.
 * @param rangeB - Output range as a two-element `[low, high]` array; `high < low` is allowed and reverses the mapping.
 * @param clamp - When `true`, constrain the result to the output range regardless of its direction.
 * @returns The remapped value, or `NaN` if a range array is missing an endpoint.
 * @example
 * ```ts
 * modulate(5, [0, 10], [0, 100]); // → 50
 * ```
 */
export function modulate(value: number, rangeA: number[], rangeB: number[], clamp = false): number {
	const [fromLow, fromHigh] = rangeA;
	const [v0, v1] = rangeB;
	if (fromHigh - fromLow === 0) {
		return clamp ? Math.min(v0, v1) : v0;
	}
	const result = v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0);

	return clamp
		? v0 < v1
			? Math.max(Math.min(result, v1), v0)
			: Math.max(Math.min(result, v0), v1)
		: result;
}
