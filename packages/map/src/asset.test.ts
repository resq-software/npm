// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { parseAssetFrame } from "./asset";

describe("parseAssetFrame", () => {
	it("parses a full fleet frame (JSON string)", () => {
		const asset = parseAssetFrame(
			'{"drone_id":"UNIT-1","lat":38.9,"lon":-77,"heading_deg":120,"battery_pct":84,"alt":150,"status":"active"}',
		);

		expect(asset).toEqual({
			altitude: 150,
			battery: 84,
			heading: 120,
			id: "UNIT-1",
			latitude: 38.9,
			longitude: -77,
			status: "active",
		});
	});

	it("accepts field aliases and an already-parsed object", () => {
		const asset = parseAssetFrame({ heading: 45, id: "A2", latitude: 10, longitude: 20 });

		expect(asset).toEqual({ heading: 45, id: "A2", latitude: 10, longitude: 20 });
	});

	it("coerces numeric strings", () => {
		const asset = parseAssetFrame({ drone_id: "A3", lat: "1.5", lon: "-2.5" });

		expect(asset?.latitude).toBe(1.5);
		expect(asset?.longitude).toBe(-2.5);
	});

	it("returns null without an id", () => {
		expect(parseAssetFrame({ lat: 1, lon: 2 })).toBeNull();
	});

	it("returns null without a finite position", () => {
		expect(parseAssetFrame({ id: "A4", lat: Number.NaN, lon: 2 })).toBeNull();
		expect(parseAssetFrame({ id: "A5" })).toBeNull();
	});

	it("returns null on malformed or non-object input", () => {
		expect(parseAssetFrame("not json")).toBeNull();
		expect(parseAssetFrame("42")).toBeNull();
	});
});

describe("position validation", () => {
	it("refuses a frame whose latitude is out of range", () => {
		expect(parseAssetFrame({ heading_deg: 0, id: "a", lat: 800, lon: 0 })).toBeNull();
	});

	it("refuses a frame whose longitude is out of range", () => {
		expect(parseAssetFrame({ heading_deg: 0, id: "a", lat: 0, lon: 400 })).toBeNull();
	});

	it("accepts the extremes of the valid range", () => {
		expect(parseAssetFrame({ id: "a", lat: 90, lon: 180 })).not.toBeNull();
		expect(parseAssetFrame({ id: "a", lat: -90, lon: -180 })).not.toBeNull();
	});
});

describe("absent heading", () => {
	it("omits the key entirely rather than defaulting to due north", () => {
		const asset = parseAssetFrame({ drone_id: "A4", lat: 1, lon: 2 });

		expect(asset).toEqual({ id: "A4", latitude: 1, longitude: 2 });
		// Not just undefined — the key must not be there, so a consumer spreading the
		// asset cannot pick up a heading of 0 from it.
		expect(asset !== null && "heading" in asset).toBe(false);
	});

	it("still reports a heading of zero when the frame actually says zero", () => {
		// 0 is a real bearing. Only an absent reading is absent.
		const asset = parseAssetFrame({ drone_id: "A5", heading_deg: 0, lat: 1, lon: 2 });

		expect(asset?.heading).toBe(0);
		expect(asset !== null && "heading" in asset).toBe(true);
	});
});

describe("heading normalisation", () => {
	it("wraps a heading past a full turn", () => {
		expect(parseAssetFrame({ heading_deg: 450, id: "a", lat: 0, lon: 0 })?.heading).toBe(90);
	});

	it("wraps a negative heading", () => {
		expect(parseAssetFrame({ heading_deg: -90, id: "a", lat: 0, lon: 0 })?.heading).toBe(270);
	});

	it("leaves an in-range heading alone", () => {
		expect(parseAssetFrame({ heading_deg: 123, id: "a", lat: 0, lon: 0 })?.heading).toBe(123);
	});
});
