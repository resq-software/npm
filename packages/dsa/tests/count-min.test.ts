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
import { CountMinSketch } from "../src/count-min.js";

describe("CountMinSketch", () => {
	describe("basic counting", () => {
		it("tracks frequency with bounded overcount", () => {
			const cms = new CountMinSketch(0.01, 0.01);
			cms.increment("drone-1", 5);
			cms.increment("drone-1", 3);
			cms.increment("drone-2", 1);
			expect(cms.estimate("drone-1")).toBeGreaterThanOrEqual(8);
			expect(cms.estimate("drone-2")).toBeGreaterThanOrEqual(1);
		});

		it("returns 0 for untracked keys", () => {
			const cms = new CountMinSketch(0.1, 0.1);
			expect(cms.estimate("ghost")).toBe(0);
		});

		it("increment defaults to 1", () => {
			const cms = new CountMinSketch(0.01, 0.01);
			cms.increment("key");
			cms.increment("key");
			expect(cms.estimate("key")).toBeGreaterThanOrEqual(2);
		});

		it("estimates are stable across repeated calls", () => {
			const cms = new CountMinSketch(0.01, 0.01);
			cms.increment("k", 7);
			const a = cms.estimate("k");
			const b = cms.estimate("k");
			const c = cms.estimate("k");
			expect(a).toBe(b);
			expect(b).toBe(c);
		});
	});

	describe("constructor validation", () => {
		it("throws RangeError when epsilon is 0", () => {
			expect(() => new CountMinSketch(0, 0.01)).toThrow(RangeError);
		});

		it("throws RangeError when epsilon is 1", () => {
			expect(() => new CountMinSketch(1, 0.01)).toThrow(RangeError);
		});

		it("throws RangeError when epsilon is negative", () => {
			expect(() => new CountMinSketch(-0.1, 0.01)).toThrow(RangeError);
		});

		it("throws RangeError when delta is 0", () => {
			expect(() => new CountMinSketch(0.01, 0)).toThrow(RangeError);
		});

		it("throws RangeError when delta is 1", () => {
			expect(() => new CountMinSketch(0.01, 1)).toThrow(RangeError);
		});

		it("throws RangeError when delta is negative", () => {
			expect(() => new CountMinSketch(0.01, -0.01)).toThrow(RangeError);
		});

		it("accepts edge values just inside (0, 1)", () => {
			expect(() => new CountMinSketch(0.0001, 0.0001)).not.toThrow();
			expect(() => new CountMinSketch(0.9999, 0.9999)).not.toThrow();
		});
	});

	describe("over-estimate guarantee", () => {
		it("never under-counts the true frequency for a single key", () => {
			const cms = new CountMinSketch(0.01, 0.01);
			const truth = 1_234;
			for (let i = 0; i < truth; i++) cms.increment("hot");
			expect(cms.estimate("hot")).toBeGreaterThanOrEqual(truth);
		});

		it("error bound holds for distinct heavy hitters", () => {
			// Build a stream with one heavy hitter and many singletons.
			const epsilon = 0.001;
			const cms = new CountMinSketch(epsilon, 0.01);
			const heavyTrue = 5_000;
			const noise = 5_000;
			for (let i = 0; i < heavyTrue; i++) cms.increment("hot");
			for (let i = 0; i < noise; i++) cms.increment(`noise-${i}`);

			const total = heavyTrue + noise;
			const allowedError = epsilon * total;
			const estimate = cms.estimate("hot");
			expect(estimate).toBeGreaterThanOrEqual(heavyTrue);
			expect(estimate).toBeLessThanOrEqual(heavyTrue + allowedError);
		});
	});

	describe("multi-key behaviour", () => {
		it("tracks distinct keys independently", () => {
			const cms = new CountMinSketch(0.001, 0.01);
			cms.increment("a", 100);
			cms.increment("b", 50);
			cms.increment("c", 1);
			expect(cms.estimate("a")).toBeGreaterThanOrEqual(100);
			expect(cms.estimate("b")).toBeGreaterThanOrEqual(50);
			expect(cms.estimate("c")).toBeGreaterThanOrEqual(1);
		});

		it("handles empty string and unicode keys", () => {
			const cms = new CountMinSketch(0.01, 0.01);
			cms.increment("");
			cms.increment("🔥", 3);
			expect(cms.estimate("")).toBeGreaterThanOrEqual(1);
			expect(cms.estimate("🔥")).toBeGreaterThanOrEqual(3);
		});
	});

	describe("increment counts", () => {
		it("supports large positive increments in one call", () => {
			const cms = new CountMinSketch(0.01, 0.01);
			cms.increment("bulk", 1_000_000);
			expect(cms.estimate("bulk")).toBeGreaterThanOrEqual(1_000_000);
		});
	});
});
