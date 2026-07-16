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

import { describe, expect, it } from "vitest";
import {
	generateNJitteredKeysBetween,
	generateNKeysBetween,
	validateOrderKey,
} from "../src/fractional-indexing.js";

// Single-key helper: the non-jittered generator with n=1.
const keyBetween = (a: string | null, b: string | null) => generateNKeysBetween(a, b, 1)[0];

describe("fractionalIndexing", () => {
	describe("generateKeyBetween (golden vectors)", () => {
		it.each([
			[null, null, "a0"],
			["a0", null, "a1"],
			["a1", null, "a2"],
			[null, "a0", "Zz"],
			["a0", "a1", "a0V"],
			["a1", "a2", "a1V"],
		])("between %o and %o is %o", (a, b, expected) => {
			expect(keyBetween(a, b)).toBe(expected);
		});
	});

	describe("generateNKeysBetween (golden vectors)", () => {
		it.each<[string | null, string | null, number, string[]]>([
			[null, null, 2, ["a0", "a1"]],
			["a1", null, 2, ["a2", "a3"]],
			[null, "a0", 2, ["Zy", "Zz"]],
			["a0", "a1", 2, ["a0G", "a0V"]],
			[null, null, 5, ["a0", "a1", "a2", "a3", "a4"]],
		])("%o keys between %o and %o", (a, b, n, expected) => {
			expect(generateNKeysBetween(a, b, n)).toEqual(expected);
		});

		it("returns an empty array for n = 0", () => {
			expect(generateNKeysBetween(null, null, 0)).toEqual([]);
		});
	});

	describe("errors", () => {
		it("throws when a >= b", () => {
			expect(() => keyBetween("a1", "a0")).toThrow();
			expect(() => keyBetween("a0", "a0")).toThrow();
		});

		it("throws on invalid input keys", () => {
			expect(() => keyBetween("a00", null)).toThrow(); // trailing zero
			expect(() => keyBetween("", null)).toThrow();
			expect(() => keyBetween("foo", null)).toThrow();
		});
	});

	describe("validateOrderKey", () => {
		it.each(["a0", "a1", "a0V", "Zz", "a0G", "b127"])("accepts %s", (key) => {
			expect(() => validateOrderKey(key)).not.toThrow();
		});

		it.each([
			"", // empty
			"a", // integer part too short
			"1", // invalid head
			"a00", // trailing zero in fraction
			"foo", // invalid head
			`A${"0".repeat(26)}`, // the reserved smallest-integer key
		])("rejects %o", (key) => {
			expect(() => validateOrderKey(key)).toThrow();
		});
	});

	describe("invariants", () => {
		it("generateNKeysBetween yields strictly increasing, valid, in-bounds keys", () => {
			const keys = generateNKeysBetween("a0", "a1", 200);
			expect(keys).toHaveLength(200);
			let prev = "a0";
			for (const key of keys) {
				expect(() => validateOrderKey(key)).not.toThrow();
				expect(key > prev).toBe(true);
				expect(key < "a1").toBe(true);
				prev = key;
			}
		});

		it("stays ordered while repeatedly inserting after the last key (integer carries)", () => {
			let key = keyBetween(null, null);
			let prev = "";
			for (let i = 0; i < 200; i++) {
				expect(() => validateOrderKey(key)).not.toThrow();
				expect(key > prev).toBe(true);
				prev = key;
				key = keyBetween(key, null);
			}
		});

		it("stays ordered while repeatedly inserting before the first key (integer borrows)", () => {
			let key = keyBetween(null, null);
			let next = "zzzzz";
			for (let i = 0; i < 200; i++) {
				expect(() => validateOrderKey(key)).not.toThrow();
				expect(key < next).toBe(true);
				next = key;
				key = keyBetween(null, key);
			}
		});

		it("generateNJitteredKeysBetween yields ordered, valid, in-bounds, distinct keys", () => {
			const keys = generateNJitteredKeysBetween("a0", "a5", 100);
			expect(keys).toHaveLength(100);
			expect(new Set(keys).size).toBe(100);
			let prev = "a0";
			for (const key of keys) {
				expect(() => validateOrderKey(key)).not.toThrow();
				expect(key > prev).toBe(true);
				expect(key < "a5").toBe(true);
				prev = key;
			}
		});

		it("jittered keys land strictly between their neighbours", () => {
			const a = keyBetween(null, null);
			const b = keyBetween(a, null);
			for (let i = 0; i < 50; i++) {
				const mid = generateNJitteredKeysBetween(a, b, 1)[0];
				expect(mid > a).toBe(true);
				expect(mid < b).toBe(true);
				expect(() => validateOrderKey(mid)).not.toThrow();
			}
		});
	});
});
