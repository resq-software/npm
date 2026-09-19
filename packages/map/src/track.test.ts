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

describe("antimeridian", () => {
	it("splits a track that crosses the dateline into separate lines", () => {
		// Westbound across 180°: without a split this draws back across the whole globe.
		const collection = toTrackGeoJSON([
			{ latitude: 10, longitude: 178 },
			{ latitude: 10, longitude: 179.5 },
			{ latitude: 10, longitude: -179.5 },
			{ latitude: 10, longitude: -178 },
		]);
		expect(collection.features).toHaveLength(2);
		// Each side runs all the way to the dateline rather than stopping short of it.
		expect(collection.features[0]?.geometry.coordinates).toEqual([
			[178, 10],
			[179.5, 10],
			[180, 10],
		]);
		expect(collection.features[1]?.geometry.coordinates).toEqual([
			[-180, 10],
			[-179.5, 10],
			[-178, 10],
		]);
	});

	it("leaves a track that never crosses the dateline as one line", () => {
		const collection = toTrackGeoJSON([
			{ latitude: 10, longitude: -5 },
			{ latitude: 11, longitude: 5 },
			{ latitude: 12, longitude: 15 },
		]);
		expect(collection.features).toHaveLength(1);
		expect(collection.features[0]?.geometry.coordinates).toHaveLength(3);
	});

	it("keeps a single-fix far side alive via the boundary point", () => {
		// Only one fix past the dateline. Without the interpolated boundary point that
		// side would be a one-point segment and get dropped.
		const collection = toTrackGeoJSON([
			{ latitude: 10, longitude: 178 },
			{ latitude: 10, longitude: 179.5 },
			{ latitude: 10, longitude: -179.5 },
		]);
		expect(collection.features).toHaveLength(2);
		expect(collection.features[1]?.geometry.coordinates).toEqual([
			[-180, 10],
			[-179.5, 10],
		]);
	});

	it("draws a two-fix crossing as two lines rather than nothing", () => {
		// Regression: splitting without boundary points left two single-point segments,
		// both discarded, so two perfectly good fixes rendered as no track at all.
		const collection = toTrackGeoJSON([
			{ latitude: 10, longitude: 179 },
			{ latitude: 20, longitude: -179 },
		]);
		expect(collection.features).toHaveLength(2);
		expect(collection.features[0]?.geometry.coordinates).toEqual([
			[179, 10],
			[180, 15],
		]);
		expect(collection.features[1]?.geometry.coordinates).toEqual([
			[-180, 15],
			[-179, 20],
		]);
	});

	it("interpolates the crossing latitude westbound too", () => {
		const collection = toTrackGeoJSON([
			{ latitude: 0, longitude: -179 },
			{ latitude: 10, longitude: 179 },
		]);
		expect(collection.features[0]?.geometry.coordinates).toEqual([
			[-179, 0],
			[-180, 5],
		]);
		expect(collection.features[1]?.geometry.coordinates).toEqual([
			[180, 5],
			[179, 10],
		]);
	});
});

describe("position validation", () => {
	it("drops a point outside the valid latitude range", () => {
		const collection = toTrackGeoJSON([
			{ latitude: 10, longitude: 0 },
			{ latitude: 800, longitude: 1 },
			{ latitude: 11, longitude: 2 },
		]);
		expect(collection.features[0]?.geometry.coordinates).toEqual([
			[0, 10],
			[2, 11],
		]);
	});

	it("drops a point outside the valid longitude range", () => {
		const collection = toTrackGeoJSON([
			{ latitude: 10, longitude: 0 },
			{ latitude: 10, longitude: 400 },
			{ latitude: 11, longitude: 2 },
		]);
		expect(collection.features[0]?.geometry.coordinates).toHaveLength(2);
	});
});
