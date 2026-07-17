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
 * @fileoverview Fast, deterministic, non-cryptographic hashing helpers — a 32-bit
 * string/buffer hash for cache keys and change detection, plus a lightweight string
 * obfuscation transform. Not suitable for security-sensitive digests; use the
 * SHA-256 helper in {@link @resq-systems/security/crypto} for those.
 *
 * @module @resq-systems/security/hash
 */

/**
 * Compute a deterministic non-cryptographic 32-bit hash of a string.
 *
 * Uses the classic `hash * 31 + charCode` accumulation (expressed as
 * `(hash << 5) - hash`), yielding the same value for the same input across runs.
 * Intended for cache keys and change detection, not for security.
 *
 * @param string - The input to hash.
 * @returns The signed 32-bit hash rendered as a decimal string.
 *
 * @example
 * ```ts
 * getHashForString("hello") === getHashForString("hello"); // → true
 * ```
 */
export function getHashForString(string: string): string {
	let hash = 0;
	for (let i = 0; i < string.length; i++) {
		hash = (hash << 5) - hash + string.charCodeAt(i);
		hash |= 0; // Coerce the accumulator back to a signed 32-bit integer.
	}
	return `${hash}`;
}

/**
 * Hash an arbitrary value by serializing it to JSON and hashing the result.
 *
 * Key ordering follows `JSON.stringify`, so two structurally equal objects with
 * differently ordered keys can hash differently.
 *
 * @param obj - Any JSON-serializable value.
 * @returns The 32-bit hash of the serialized form, as a decimal string.
 * @throws {TypeError} When `obj` cannot be serialized: a circular
 *   reference or a `BigInt` makes `JSON.stringify` throw, and a value
 *   that stringifies to `undefined` (a bare function, `symbol`, or
 *   `undefined`) makes the downstream `.length` access throw.
 */
export function getHashForObject(obj: unknown): string {
	return getHashForString(JSON.stringify(obj));
}

/**
 * Compute a deterministic non-cryptographic 32-bit hash of an `ArrayBuffer`.
 *
 * Applies the same accumulation as {@link getHashForString} over each byte.
 *
 * @param buffer - The bytes to hash.
 * @returns The signed 32-bit hash rendered as a decimal string.
 */
export function getHashForBuffer(buffer: ArrayBuffer): string {
	const view = new DataView(buffer);
	let hash = 0;
	for (let i = 0; i < view.byteLength; i++) {
		hash = (hash << 5) - hash + view.getUint8(i);
		hash |= 0; // Coerce the accumulator back to a signed 32-bit integer.
	}
	return `${hash}`;
}

/**
 * Reversibly scramble a string by rotating character blocks and shifting digits.
 *
 * A lightweight, non-cryptographic obfuscation: it reorders characters via a fixed
 * sequence of block rotations, reverses the result, and maps each digit `d` to
 * `d < 5 ? d + 5 : d > 5 ? d - 5 : d`. Provides obscurity, not security — do not
 * use it to protect secrets.
 *
 * Despite "scramble", the transform is **not a true inverse**: the digit map sends
 * both `0` and `5` to `5`, so any input containing those digits cannot be
 * recovered unambiguously. Non-digit characters (including whitespace) are only
 * reordered, never substituted. Deterministic and free of side effects.
 *
 * @param str - The string to transform.
 * @returns The transformed string, same length as `str`.
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
