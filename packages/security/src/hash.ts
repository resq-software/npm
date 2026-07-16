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
 * Hash a string using the FNV-1a algorithm.
 *
 * Generates a deterministic hash value for a given string using a variant of the FNV-1a
 * (Fowler-Noll-Vo) algorithm. The hash is returned as a string representation of a 32-bit integer.
 */
export function getHashForString(string: string): string {
	let hash = 0;
	for (let i = 0; i < string.length; i++) {
		hash = (hash << 5) - hash + string.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}
	return `${hash}`;
}

/**
 * Hash an object by converting it to JSON and then hashing the resulting string.
 */
export function getHashForObject(obj: unknown): string {
	return getHashForString(JSON.stringify(obj));
}

/**
 * Hash an ArrayBuffer using the FNV-1a algorithm.
 */
export function getHashForBuffer(buffer: ArrayBuffer): string {
	const view = new DataView(buffer);
	let hash = 0;
	for (let i = 0; i < view.byteLength; i++) {
		hash = (hash << 5) - hash + view.getUint8(i);
		hash |= 0; // Convert to 32bit integer
	}
	return `${hash}`;
}

/**
 * Applies a string transformation algorithm that rearranges and modifies characters.
 */
export function lns(str: string): string {
	const result = str.split("");
	result.push(...result.splice(0, Math.round(result.length / 5)));
	result.push(...result.splice(0, Math.round(result.length / 4)));
	result.push(...result.splice(0, Math.round(result.length / 3)));
	result.push(...result.splice(0, Math.round(result.length / 2)));
	return result
		.reverse()
		.map((n) => {
			const num = Number(n);
			return Number.isNaN(num) || n.trim() === ""
				? n
				: num < 5
					? String(5 + num)
					: num > 5
						? String(num - 5)
						: n;
		})
		.join("");
}
