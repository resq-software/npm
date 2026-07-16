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
 * Linear interpolate between two values.
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Inverse lerp between two values. Given a value `t` in the range [a, b], returns a number between
 * 0 and 1.
 */
export function invLerp(a: number, b: number, t: number): number {
	if (b - a === 0) return 0;
	return (t - a) / (b - a);
}

/**
 * Seeded random number generator, using xorshift. The result will always be between -1 and 1.
 * Adapted from seedrandom.
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
 * Modulate a value between two ranges.
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
