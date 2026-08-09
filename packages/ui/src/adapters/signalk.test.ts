// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	applyDelta,
	flattenDelta,
	latestTimestamp,
	readNumber,
	signalKToCompass,
	signalKToDepth,
} from "./signalk";

const HEADING_DELTA = {
	context: "vessels.self",
	updates: [
		{
			timestamp: "2026-01-01T00:00:00.000Z",
			values: [
				{ path: "navigation.headingTrue", value: Math.PI / 2 },
				{ path: "navigation.speedOverGround", value: 5.14444 },
			],
		},
	],
};

describe("flattenDelta", () => {
	it("collects every path/value pair", () => {
		const paths = flattenDelta(HEADING_DELTA);

		expect(paths.get("navigation.headingTrue")).toBeCloseTo(Math.PI / 2, 9);
		expect(paths.get("navigation.speedOverGround")).toBeCloseTo(5.14444, 9);
	});

	it("collects across multiple update blocks", () => {
		const paths = flattenDelta({
			updates: [{ values: [{ path: "a", value: 1 }] }, { values: [{ path: "b", value: 2 }] }],
		});

		expect([...paths.keys()]).toEqual(["a", "b"]);
	});

	it("keeps the last value for a repeated path", () => {
		const paths = flattenDelta({
			updates: [{ values: [{ path: "a", value: 1 }] }, { values: [{ path: "a", value: 9 }] }],
		});

		expect(paths.get("a")).toBe(9);
	});

	it("tolerates an empty or malformed delta", () => {
		expect(flattenDelta({}).size).toBe(0);
		expect(flattenDelta({ updates: [] }).size).toBe(0);
		expect(flattenDelta({ updates: [{}] }).size).toBe(0);
	});

	it("keeps non-numeric values, such as a position object", () => {
		const paths = flattenDelta({
			updates: [
				{ values: [{ path: "navigation.position", value: { latitude: 1, longitude: 2 } }] },
			],
		});

		expect(paths.get("navigation.position")).toEqual({ latitude: 1, longitude: 2 });
	});
});

describe("applyDelta", () => {
	it("folds a delta over previous paths", () => {
		const first = applyDelta(new Map(), { updates: [{ values: [{ path: "a", value: 1 }] }] });
		const second = applyDelta(first, { updates: [{ values: [{ path: "b", value: 2 }] }] });

		expect(second.get("a")).toBe(1);
		expect(second.get("b")).toBe(2);
	});

	it("overwrites a path that the delta refreshes", () => {
		const first = applyDelta(new Map(), { updates: [{ values: [{ path: "a", value: 1 }] }] });
		const second = applyDelta(first, { updates: [{ values: [{ path: "a", value: 5 }] }] });

		expect(second.get("a")).toBe(5);
	});

	it("returns a new map rather than mutating the previous one", () => {
		const first = applyDelta(new Map(), { updates: [{ values: [{ path: "a", value: 1 }] }] });
		const second = applyDelta(first, { updates: [{ values: [{ path: "b", value: 2 }] }] });

		expect(second).not.toBe(first);
		expect(first.has("b")).toBe(false);
	});
});

describe("readNumber", () => {
	it("reads a finite number", () => {
		expect(readNumber(new Map([["a", 4]]), "a")).toBe(4);
	});

	it("rejects a non-numeric or absent value", () => {
		expect(readNumber(new Map([["a", "4"]]), "a")).toBeUndefined();
		expect(readNumber(new Map([["a", Number.NaN]]), "a")).toBeUndefined();
		expect(readNumber(new Map(), "a")).toBeUndefined();
	});
});

describe("signalKToCompass", () => {
	it("converts radians to degrees and metres per second to knots", () => {
		const compass = signalKToCompass(flattenDelta(HEADING_DELTA));

		expect(compass.heading).toBeCloseTo(90, 6);
		expect(compass.speed).toBeCloseTo(10, 3);
	});

	it("converts course over ground", () => {
		const compass = signalKToCompass(new Map([["navigation.courseOverGroundTrue", Math.PI]]));

		expect(compass.course).toBeCloseTo(180, 6);
	});

	it("ignores magnetic heading rather than substituting it", () => {
		const compass = signalKToCompass(new Map([["navigation.headingMagnetic", Math.PI / 2]]));

		expect(compass.heading).toBeUndefined();
	});

	it("leaves absent paths undefined", () => {
		expect(signalKToCompass(new Map())).toEqual({
			course: undefined,
			heading: undefined,
			speed: undefined,
		});
	});
});

describe("signalKToDepth", () => {
	it("builds keel depth from the published offsets", () => {
		const depth = signalKToDepth(
			new Map<string, unknown>([
				["environment.depth.belowSurface", 16],
				["environment.depth.surfaceToTransducer", 0.4],
				["environment.depth.transducerToKeel", 1.1],
			]),
		);

		expect(depth.depth).toBeCloseTo(1.5, 6);
		expect(depth.seabed).toBe(16);
	});

	it("reconstructs keel depth from surface and keel soundings", () => {
		const depth = signalKToDepth(
			new Map<string, unknown>([
				["environment.depth.belowSurface", 16],
				["environment.depth.belowKeel", 14.5],
			]),
		);

		expect(depth.depth).toBeCloseTo(1.5, 6);
	});

	it("prefers the published offsets over the reconstruction", () => {
		const depth = signalKToDepth(
			new Map<string, unknown>([
				["environment.depth.belowSurface", 16],
				["environment.depth.belowKeel", 10],
				["environment.depth.surfaceToTransducer", 0.4],
				["environment.depth.transducerToKeel", 1.1],
			]),
		);

		expect(depth.depth).toBeCloseTo(1.5, 6);
	});

	it("yields a sounded depth alone when the offsets are unknown", () => {
		const depth = signalKToDepth(
			new Map<string, unknown>([["environment.depth.belowSurface", 16]]),
		);

		expect(depth.seabed).toBe(16);
		expect(depth.depth).toBeUndefined();
	});

	it("leaves an empty path set undefined", () => {
		expect(signalKToDepth(new Map())).toEqual({ depth: undefined, seabed: undefined });
	});
});

describe("latestTimestamp", () => {
	it("reads the observation time as epoch milliseconds", () => {
		expect(latestTimestamp(HEADING_DELTA)).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
	});

	it("takes the newest across several updates", () => {
		const newest = latestTimestamp({
			updates: [
				{ timestamp: "2026-01-01T00:00:00.000Z", values: [] },
				{ timestamp: "2026-01-01T00:00:05.000Z", values: [] },
				{ timestamp: "2026-01-01T00:00:02.000Z", values: [] },
			],
		});

		expect(newest).toBe(Date.parse("2026-01-01T00:00:05.000Z"));
	});

	it("returns undefined when no update carries a usable timestamp", () => {
		expect(latestTimestamp({})).toBeUndefined();
		expect(latestTimestamp({ updates: [{ values: [] }] })).toBeUndefined();
		expect(latestTimestamp({ updates: [{ timestamp: "not-a-date", values: [] }] })).toBeUndefined();
	});
});
