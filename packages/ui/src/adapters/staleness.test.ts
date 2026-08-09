// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DEFAULT_MAX_AGE_MS, DEFAULT_MAX_SKEW_MS, isStale, readingAge } from "./staleness";

const NOW = 1_800_000_000_000;

describe("isStale", () => {
	it("accepts a reading inside the window", () => {
		expect(isStale(NOW - 1000, NOW, 5000)).toBe(false);
	});

	it("rejects a reading past the window", () => {
		expect(isStale(NOW - 6000, NOW, 5000)).toBe(true);
	});

	it("treats the boundary as still fresh", () => {
		expect(isStale(NOW - 5000, NOW, 5000)).toBe(false);
	});

	it("treats an unknown timestamp as stale, not as fresh", () => {
		// An unknown age is not a young one; assuming freshness is the failure
		// this guard exists to prevent.
		expect(isStale(undefined, NOW)).toBe(true);
		expect(isStale(Number.NaN, NOW)).toBe(true);
	});

	it("treats an unusable clock as stale", () => {
		expect(isStale(NOW, Number.NaN)).toBe(true);
	});

	it("treats a negative or non-finite window as stale", () => {
		expect(isStale(NOW, NOW, -1)).toBe(true);
		expect(isStale(NOW, NOW, Number.NaN)).toBe(true);
	});

	it("tolerates modest clock skew rather than raising a false alarm", () => {
		// A vehicle clock slightly ahead of the console is normal.
		expect(isStale(NOW + 250, NOW, 5000)).toBe(false);
	});

	it("disbelieves a timestamp far in the future rather than trusting it forever", () => {
		// Unbounded, a badly-set clock would keep frozen data fresh indefinitely.
		expect(isStale(NOW + DEFAULT_MAX_SKEW_MS + 1, NOW, 5000)).toBe(true);
		expect(isStale(NOW + 86_400_000, NOW, 5000)).toBe(true);
	});

	it("treats the skew boundary as still tolerated", () => {
		expect(isStale(NOW + DEFAULT_MAX_SKEW_MS, NOW, 5000)).toBe(false);
	});

	it("honours a custom skew allowance", () => {
		expect(isStale(NOW + 2000, NOW, 5000, 1000)).toBe(true);
		expect(isStale(NOW + 500, NOW, 5000, 1000)).toBe(false);
	});

	it("treats a negative or non-finite skew allowance as stale", () => {
		expect(isStale(NOW + 1, NOW, 5000, -1)).toBe(true);
		expect(isStale(NOW + 1, NOW, 5000, Number.NaN)).toBe(true);
	});

	it("defaults the window when none is given", () => {
		expect(isStale(NOW - (DEFAULT_MAX_AGE_MS - 1), NOW)).toBe(false);
		expect(isStale(NOW - (DEFAULT_MAX_AGE_MS + 1), NOW)).toBe(true);
	});
});

describe("readingAge", () => {
	it("measures elapsed milliseconds", () => {
		expect(readingAge(NOW - 1500, NOW)).toBe(1500);
	});

	it("clamps a future timestamp to zero rather than reporting negative age", () => {
		expect(readingAge(NOW + 500, NOW)).toBe(0);
	});

	it("returns undefined when either side is unusable", () => {
		expect(readingAge(undefined, NOW)).toBeUndefined();
		expect(readingAge(NOW, Number.NaN)).toBeUndefined();
	});
});
