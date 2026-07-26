// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	clamp,
	describeArc,
	INSTRUMENT_CENTER,
	linearTicks,
	polar,
	toFinite,
	valueToAngle,
} from "./instrument-dial";

describe("instrument-dial geometry", () => {
	describe("polar", () => {
		it("places 0° at top, 90° at right, 180° at bottom, 270° at left", () => {
			expect(polar(0, 10)).toEqual({ x: INSTRUMENT_CENTER, y: INSTRUMENT_CENTER - 10 });

			const right = polar(90, 10);
			expect(right.x).toBeCloseTo(INSTRUMENT_CENTER + 10);
			expect(right.y).toBeCloseTo(INSTRUMENT_CENTER);

			const bottom = polar(180, 10);
			expect(bottom.x).toBeCloseTo(INSTRUMENT_CENTER);
			expect(bottom.y).toBeCloseTo(INSTRUMENT_CENTER + 10);

			const left = polar(270, 10);
			expect(left.x).toBeCloseTo(INSTRUMENT_CENTER - 10);
			expect(left.y).toBeCloseTo(INSTRUMENT_CENTER);
		});
	});

	describe("clamp", () => {
		it("bounds values to the range", () => {
			expect(clamp(5, 0, 10)).toBe(5);
			expect(clamp(-3, 0, 10)).toBe(0);
			expect(clamp(42, 0, 10)).toBe(10);
		});
	});

	describe("toFinite", () => {
		it("returns finite numbers unchanged and falls back otherwise", () => {
			expect(toFinite(7)).toBe(7);
			expect(toFinite(undefined)).toBe(0);
			expect(toFinite(Number.NaN, 3)).toBe(3);
			expect(toFinite(Number.POSITIVE_INFINITY, 3)).toBe(3);
		});
	});

	describe("valueToAngle", () => {
		it("maps the range endpoints and midpoint across the sweep", () => {
			expect(valueToAngle(0, 0, 100, 210, 300)).toBe(210);
			expect(valueToAngle(100, 0, 100, 210, 300)).toBe(510);
			expect(valueToAngle(50, 0, 100, 210, 300)).toBe(360);
		});

		it("clamps out-of-range values", () => {
			expect(valueToAngle(-20, 0, 100, 210, 300)).toBe(210);
			expect(valueToAngle(140, 0, 100, 210, 300)).toBe(510);
		});

		it("maps a zero-width range to the start angle", () => {
			expect(valueToAngle(5, 4, 4, 210, 300)).toBe(210);
		});
	});

	describe("linearTicks", () => {
		it("returns divisions + 1 evenly spaced values", () => {
			expect(linearTicks(0, 100, 4)).toEqual([0, 25, 50, 75, 100]);
		});

		it("guards against a non-positive division count", () => {
			expect(linearTicks(0, 10, 0)).toEqual([0, 10]);
		});
	});

	describe("describeArc", () => {
		it("produces a move-then-arc path with the expected sweep flag", () => {
			const clockwise = describeArc(90, 0, 90);
			expect(clockwise.startsWith("M ")).toBe(true);
			expect(clockwise).toContain(" A 90 90 0 0 1 ");

			const counter = describeArc(90, 90, 0);
			expect(counter).toContain(" A 90 90 0 0 0 ");
		});
	});
});
