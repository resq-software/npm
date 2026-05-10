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

import { describe, expect, it } from "vitest";
import { BloomFilter } from "../src/bloom.js";

describe("BloomFilter", () => {
	describe("basic membership", () => {
		it("has() returns true for added items", () => {
			const bf = new BloomFilter(1000);
			bf.add("drone-001");
			bf.add("drone-002");
			expect(bf.has("drone-001")).toBe(true);
			expect(bf.has("drone-002")).toBe(true);
		});

		it("has() returns false for absent items", () => {
			const bf = new BloomFilter(1000, 0.001);
			bf.add("seen");
			expect(bf.has("unseen")).toBe(false);
			expect(bf.has("also-unseen")).toBe(false);
		});

		it("never has false negatives", () => {
			const bf = new BloomFilter(500);
			const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
			items.forEach((x) => bf.add(x));
			expect(items.every((x) => bf.has(x))).toBe(true);
		});

		it("returns false on empty filter", () => {
			const bf = new BloomFilter(100);
			expect(bf.has("anything")).toBe(false);
		});

		it("adding the same item twice is idempotent", () => {
			const bf = new BloomFilter(100);
			bf.add("x");
			bf.add("x");
			expect(bf.has("x")).toBe(true);
		});
	});

	describe("constructor validation", () => {
		it("throws RangeError when errorRate is 0", () => {
			expect(() => new BloomFilter(100, 0)).toThrow(RangeError);
		});

		it("throws RangeError when errorRate is 1", () => {
			expect(() => new BloomFilter(100, 1)).toThrow(RangeError);
		});

		it("throws RangeError when errorRate is negative", () => {
			expect(() => new BloomFilter(100, -0.01)).toThrow(RangeError);
		});

		it("throws RangeError when errorRate exceeds 1", () => {
			expect(() => new BloomFilter(100, 1.5)).toThrow(RangeError);
		});

		it("throws RangeError when capacity is 0", () => {
			expect(() => new BloomFilter(0)).toThrow(RangeError);
		});

		it("throws RangeError when capacity is negative", () => {
			expect(() => new BloomFilter(-1)).toThrow(RangeError);
		});

		it("accepts edge errorRate values just inside (0, 1)", () => {
			expect(() => new BloomFilter(100, 0.000001)).not.toThrow();
			expect(() => new BloomFilter(100, 0.999999)).not.toThrow();
		});
	});

	describe("input handling", () => {
		it("handles empty string", () => {
			const bf = new BloomFilter(100);
			bf.add("");
			expect(bf.has("")).toBe(true);
		});

		it("handles unicode strings", () => {
			const bf = new BloomFilter(100);
			bf.add("🚁");
			bf.add("résumé");
			bf.add("中文");
			expect(bf.has("🚁")).toBe(true);
			expect(bf.has("résumé")).toBe(true);
			expect(bf.has("中文")).toBe(true);
		});

		it("handles very long strings", () => {
			const bf = new BloomFilter(100);
			const long = "x".repeat(10_000);
			bf.add(long);
			expect(bf.has(long)).toBe(true);
		});

		it("distinguishes case-sensitive variants", () => {
			const bf = new BloomFilter(1000, 0.001);
			bf.add("Drone");
			expect(bf.has("Drone")).toBe(true);
			// "drone" might be a false positive at higher error rates,
			// but with 0.001 it should reliably differ.
			expect(bf.has("drone")).toBe(false);
		});
	});

	describe("false-positive rate bounds", () => {
		it("stays under 5% when configured at errorRate=0.01", () => {
			// Insert exactly the configured capacity, then probe with disjoint set.
			const capacity = 1000;
			const bf = new BloomFilter(capacity, 0.01);
			for (let i = 0; i < capacity; i++) bf.add(`real-${i}`);

			let falsePositives = 0;
			const probes = 5_000;
			for (let i = 0; i < probes; i++) {
				if (bf.has(`probe-${i}`)) falsePositives++;
			}
			// Empirical bound: should comfortably stay under 5x the target rate.
			expect(falsePositives / probes).toBeLessThan(0.05);
		});

		it("smaller errorRate produces fewer false positives", () => {
			const capacity = 500;
			const probes = 2_000;
			const measure = (rate: number): number => {
				const bf = new BloomFilter(capacity, rate);
				for (let i = 0; i < capacity; i++) bf.add(`real-${i}`);
				let fp = 0;
				for (let i = 0; i < probes; i++) {
					if (bf.has(`probe-${i}`)) fp++;
				}
				return fp / probes;
			};
			const tightRate = measure(0.001);
			const looseRate = measure(0.05);
			expect(tightRate).toBeLessThan(looseRate);
		});
	});

	describe("scale", () => {
		it("handles 100k inserts at low error rate", () => {
			const bf = new BloomFilter(100_000, 0.001);
			for (let i = 0; i < 100_000; i++) {
				bf.add(`drone-${i}`);
			}
			// Spot-check a sample of inserted values.
			expect(bf.has("drone-0")).toBe(true);
			expect(bf.has("drone-50000")).toBe(true);
			expect(bf.has("drone-99999")).toBe(true);
		});
	});
});
