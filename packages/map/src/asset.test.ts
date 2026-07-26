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
		expect(asset?.heading).toBe(0);
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
