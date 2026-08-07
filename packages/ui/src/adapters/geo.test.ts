// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	bearingDeg,
	courseToVelocity,
	distanceNm,
	isPosition,
	normalizeBearing,
	toLocalNm,
} from "./geo";

const ORIGIN = { latitude: 0, longitude: 0 };

describe("distanceNm", () => {
	it("measures one degree of latitude as sixty nautical miles", () => {
		expect(distanceNm(ORIGIN, { latitude: 1, longitude: 0 })).toBeCloseTo(60, 1);
	});

	it("measures one degree of longitude at the equator as sixty nautical miles", () => {
		expect(distanceNm(ORIGIN, { latitude: 0, longitude: 1 })).toBeCloseTo(60, 1);
	});

	it("shrinks a degree of longitude with latitude", () => {
		// cos(60°) = 0.5, so a degree of longitude is half as wide.
		expect(distanceNm({ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 1 })).toBeCloseTo(
			30,
			0,
		);
	});

	it("is zero for the same point", () => {
		expect(distanceNm(ORIGIN, ORIGIN)).toBe(0);
	});

	it("is symmetric", () => {
		const a = { latitude: 51.5, longitude: -0.1 };
		const b = { latitude: 48.85, longitude: 2.35 };

		expect(distanceNm(a, b)).toBeCloseTo(distanceNm(b, a), 6);
	});
});

describe("bearingDeg", () => {
	it("reads due north", () => {
		expect(bearingDeg(ORIGIN, { latitude: 1, longitude: 0 })).toBeCloseTo(0, 3);
	});

	it("reads due east", () => {
		expect(bearingDeg(ORIGIN, { latitude: 0, longitude: 1 })).toBeCloseTo(90, 3);
	});

	it("reads due south", () => {
		expect(bearingDeg(ORIGIN, { latitude: -1, longitude: 0 })).toBeCloseTo(180, 3);
	});

	it("reads due west as 270, not -90", () => {
		expect(bearingDeg(ORIGIN, { latitude: 0, longitude: -1 })).toBeCloseTo(270, 3);
	});

	it("reads a north-east diagonal near 45 degrees at the equator", () => {
		expect(bearingDeg(ORIGIN, { latitude: 1, longitude: 1 })).toBeCloseTo(45, 0);
	});
});

describe("toLocalNm", () => {
	it("projects latitude directly to north", () => {
		expect(toLocalNm(ORIGIN, { latitude: 0.5, longitude: 0 }).north).toBeCloseTo(30, 3);
	});

	it("projects longitude to east, scaled by latitude", () => {
		expect(toLocalNm(ORIGIN, { latitude: 0, longitude: 0.5 }).east).toBeCloseTo(30, 3);
		expect(
			toLocalNm({ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 0.5 }).east,
		).toBeCloseTo(15, 1);
	});

	it("signs offsets south and west negative", () => {
		const offset = toLocalNm(ORIGIN, { latitude: -0.5, longitude: -0.5 });

		expect(offset.north).toBeLessThan(0);
		expect(offset.east).toBeLessThan(0);
	});
});

describe("courseToVelocity", () => {
	it("puts a northerly course entirely on the north axis", () => {
		const v = courseToVelocity(0, 10);

		expect(v.north).toBeCloseTo(10, 6);
		expect(v.east).toBeCloseTo(0, 6);
	});

	it("puts an easterly course entirely on the east axis", () => {
		const v = courseToVelocity(90, 10);

		expect(v.east).toBeCloseTo(10, 6);
		expect(v.north).toBeCloseTo(0, 6);
	});

	it("splits a north-east course evenly", () => {
		const v = courseToVelocity(45, Math.SQRT2);

		expect(v.east).toBeCloseTo(1, 6);
		expect(v.north).toBeCloseTo(1, 6);
	});
});

describe("normalizeBearing", () => {
	it("wraps past a full turn", () => {
		expect(normalizeBearing(400)).toBe(40);
	});

	it("wraps negatives into the positive range", () => {
		expect(normalizeBearing(-90)).toBe(270);
	});

	it("leaves an in-range bearing alone", () => {
		expect(normalizeBearing(42)).toBe(42);
	});
});

describe("isPosition", () => {
	it("accepts a finite position", () => {
		expect(isPosition({ latitude: 1, longitude: 2 })).toBe(true);
	});

	it("rejects undefined and non-finite coordinates", () => {
		expect(isPosition(undefined)).toBe(false);
		expect(isPosition({ latitude: Number.NaN, longitude: 2 })).toBe(false);
		expect(isPosition({ latitude: 1, longitude: Number.POSITIVE_INFINITY })).toBe(false);
	});
});
