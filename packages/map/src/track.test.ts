// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { toTrackGeoJSON } from "./track";

describe("toTrackGeoJSON", () => {
	it("builds a LineString from two or more points", () => {
		const fc = toTrackGeoJSON([
			{ latitude: 1, longitude: 0 },
			{ latitude: 3, longitude: 2 },
			{ latitude: 5, longitude: 4 },
		]);

		expect(fc.type).toBe("FeatureCollection");
		expect(fc.features).toHaveLength(1);
		expect(fc.features[0].geometry).toEqual({
			coordinates: [
				[0, 1],
				[2, 3],
				[4, 5],
			],
			type: "LineString",
		});
	});

	it("drops non-finite points before measuring length", () => {
		const fc = toTrackGeoJSON([
			{ latitude: 1, longitude: 0 },
			{ latitude: Number.NaN, longitude: 2 },
			{ latitude: 5, longitude: 4 },
		]);

		expect(fc.features[0].geometry.coordinates).toEqual([
			[0, 1],
			[4, 5],
		]);
	});

	it("yields no feature for fewer than two valid points", () => {
		expect(toTrackGeoJSON([]).features).toHaveLength(0);
		expect(toTrackGeoJSON([{ latitude: 1, longitude: 0 }]).features).toHaveLength(0);
	});
});
