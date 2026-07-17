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

/*!
 * Adapted from tldraw's fractional indexing — itself a vendored and trimmed
 * version of the `fractional-indexing` (by arv@rocicorp.dev) and
 * `jittered-fractional-indexing` (by github@nathanhleung.com) packages, both
 * released under CC0-1.0 (public domain).
 * https://observablehq.com/@dgreensp/implementing-fractional-indexing
 */

/**
 * @fileoverview Fractional (order-key) indexing: mints compact string keys that
 * sort lexicographically, so a list item can be reordered by generating a key
 * between its two neighbours without renumbering the rest. Optional jitter
 * spreads concurrently-generated keys apart to reduce collisions.
 *
 * @module @resq-systems/dsa/fractional-indexing
 */

// Digits must be in ascending character-code order.
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ZERO = DIGITS[0]; // '0'
const LARGEST_DIGIT = DIGITS[DIGITS.length - 1]; // 'z'
// The reserved "smallest integer" key, which has no valid predecessor.
const SMALLEST_INTEGER = `A${ZERO.repeat(26)}`;
// Number of random bisections used to spread concurrently-generated keys apart,
// reducing the chance of collisions when multiple clients insert into the same
// gap at once. Each bit costs one extra key generation and ~0.17 characters of
// key length, so this trades collision resistance against compute and key size.
const JITTER_BITS = 16;

function getIntegerLength(head: string): number {
	if (head >= "a" && head <= "z") {
		return head.charCodeAt(0) - "a".charCodeAt(0) + 2;
	}
	if (head >= "A" && head <= "Z") {
		return "Z".charCodeAt(0) - head.charCodeAt(0) + 2;
	}
	throw new Error(`invalid order key head: ${head}`);
}

function getIntegerPart(key: string): string {
	const integerPartLength = getIntegerLength(key[0]);
	if (integerPartLength > key.length) {
		throw new Error(`invalid order key: ${key}`);
	}
	return key.slice(0, integerPartLength);
}

function digitIndex(char: string): number {
	const code = char.charCodeAt(0);
	if (code <= 57) return code - 48;
	if (code <= 90) return code - 55;
	return code - 61;
}

/**
 * Throws if `key` is not a canonical order key.
 */
export function validateOrderKey(key: string): void {
	if (key === SMALLEST_INTEGER) {
		throw new Error(`invalid order key: ${key}`);
	}
	const i = getIntegerPart(key);
	if (key.length > i.length && key[key.length - 1] === ZERO) {
		throw new Error(`invalid order key: ${key}`);
	}
}

function midpoint(a: string, b: string | null): string {
	if (b != null && a >= b) {
		throw new Error(`${a} >= ${b}`);
	}
	if (a.slice(-1) === ZERO || (b && b.slice(-1) === ZERO)) {
		throw new Error("trailing zero");
	}
	if (b) {
		let n = 0;
		while ((a[n] || ZERO) === b[n]) {
			n++;
		}
		if (n > 0) {
			return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
		}
	}
	const digitA = a ? digitIndex(a[0]) : 0;
	const digitB = b != null ? digitIndex(b[0]) : DIGITS.length;
	if (digitB - digitA > 1) {
		const midDigit = Math.round(0.5 * (digitA + digitB));
		return DIGITS[midDigit];
	}
	if (b && b.length > 1) {
		return b.slice(0, 1);
	}
	return DIGITS[digitA] + midpoint(a.slice(1), null);
}

function incrementInteger(x: string): string | null {
	const [head, ...digs] = x.split("");
	let carry = true;
	for (let i = digs.length - 1; carry && i >= 0; i--) {
		const d = digitIndex(digs[i]) + 1;
		if (d === DIGITS.length) {
			digs[i] = ZERO;
		} else {
			digs[i] = DIGITS[d];
			carry = false;
		}
	}
	if (carry) {
		if (head === "Z") return `a${ZERO}`;
		if (head === "z") return null;
		const h = String.fromCharCode(head.charCodeAt(0) + 1);
		if (h > "a") {
			digs.push(ZERO);
		} else {
			digs.pop();
		}
		return h + digs.join("");
	}
	return head + digs.join("");
}

function decrementInteger(x: string): string | null {
	const [head, ...digs] = x.split("");
	let borrow = true;
	for (let i = digs.length - 1; borrow && i >= 0; i--) {
		const d = digitIndex(digs[i]) - 1;
		if (d === -1) {
			digs[i] = LARGEST_DIGIT;
		} else {
			digs[i] = DIGITS[d];
			borrow = false;
		}
	}
	if (borrow) {
		if (head === "a") return `Z${LARGEST_DIGIT}`;
		if (head === "A") return null;
		const h = String.fromCharCode(head.charCodeAt(0) - 1);
		if (h < "Z") {
			digs.push(LARGEST_DIGIT);
		} else {
			digs.pop();
		}
		return h + digs.join("");
	}
	return head + digs.join("");
}

function keyBetweenUnchecked(a: string | null, b: string | null): string {
	if (a != null && b != null && a >= b) {
		throw new Error(`${a} >= ${b}`);
	}
	if (a == null) {
		if (b == null) return `a${ZERO}`;
		const ib = getIntegerPart(b);
		const fb = b.slice(ib.length);
		if (ib === SMALLEST_INTEGER) {
			return ib + midpoint("", fb);
		}
		if (ib < b) return ib;
		const res = decrementInteger(ib);
		if (res == null) throw new Error("cannot decrement any more");
		return res;
	}
	if (b == null) {
		const ia = getIntegerPart(a);
		const fa = a.slice(ia.length);
		const i = incrementInteger(ia);
		return i == null ? ia + midpoint(fa, null) : i;
	}
	const ia = getIntegerPart(a);
	const fa = a.slice(ia.length);
	const ib = getIntegerPart(b);
	const fb = b.slice(ib.length);
	if (ia === ib) {
		return ia + midpoint(fa, fb);
	}
	const i = incrementInteger(ia);
	if (i == null) throw new Error("cannot increment any more");
	if (i < b) return i;
	return ia + midpoint(fa, null);
}

function nKeysBetweenUnchecked(a: string | null, b: string | null, n: number): string[] {
	if (n === 0) return [];
	if (n === 1) return [keyBetweenUnchecked(a, b)];
	if (b == null) {
		let c = keyBetweenUnchecked(a, b);
		const result = [c];
		for (let i = 0; i < n - 1; i++) {
			c = keyBetweenUnchecked(c, b);
			result.push(c);
		}
		return result;
	}
	if (a == null) {
		let c = keyBetweenUnchecked(a, b);
		const result = [c];
		for (let i = 0; i < n - 1; i++) {
			c = keyBetweenUnchecked(a, c);
			result.push(c);
		}
		result.reverse();
		return result;
	}
	const mid = Math.floor(n / 2);
	const c = keyBetweenUnchecked(a, b);
	return [...nKeysBetweenUnchecked(a, c, mid), c, ...nKeysBetweenUnchecked(c, b, n - mid - 1)];
}

function jitterBetween(low: string | null, high: string | null): string {
	let mid = keyBetweenUnchecked(low, high);
	for (let i = 0; i < JITTER_BITS; i++) {
		if (Math.random() < 0.5) {
			low = mid;
		} else {
			high = mid;
		}
		mid = keyBetweenUnchecked(low, high);
	}
	return mid;
}

/**
 * Generate `n` jittered keys evenly spaced between `a` and `b`.
 */
export function generateNJitteredKeysBetween(
	a: string | null,
	b: string | null,
	n: number,
): string[] {
	if (n === 0) return [];
	if (a != null) validateOrderKey(a);
	if (b != null) validateOrderKey(b);
	const keys = nKeysBetweenUnchecked(a, b, n + 1);
	const result = new Array<string>(n);
	for (let i = 0; i < n; i++) {
		result[i] = jitterBetween(keys[i], keys[i + 1]);
	}
	return result;
}

/**
 * Generate `n` keys evenly spaced between `a` and `b`, without jitter.
 */
export function generateNKeysBetween(a: string | null, b: string | null, n: number): string[] {
	if (n === 0) return [];
	if (a != null) validateOrderKey(a);
	if (b != null) validateOrderKey(b);
	return nKeysBetweenUnchecked(a, b, n);
}
