// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { LidarScan } from "./lidar-scan";

/** Eight beams a quarter-turn apart, starting dead astern. Beam 4 is forward. */
const EIGHT_BEAM = [5, 5, 5, 5, 0.6, 5, 5, 5];

describe("LidarScan", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = LidarScan({ ranges: EIGHT_BEAM });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("lidar-scan");
	});

	it("reports the nearest return and its relative bearing", () => {
		const element = LidarScan({ ranges: EIGHT_BEAM });

		expect(element.props["aria-label"]).toBe(
			"Lidar scan, 8 of 8 beams returning, nearest obstacle 0.6 meters at 0 degrees, obstacle warning",
		);
	});

	it("resolves bearings to starboard as positive degrees", () => {
		// Beam 6 sits at +π/2 (to port) → relative bearing 270.
		const element = LidarScan({ ranges: [5, 5, 5, 5, 5, 5, 0.4, 5] });

		expect(element.props["aria-label"]).toBe(
			"Lidar scan, 8 of 8 beams returning, nearest obstacle 0.4 meters at 270 degrees, obstacle warning",
		);
	});

	it("omits the warning when the nearest return is outside warnRange", () => {
		const element = LidarScan({ ranges: EIGHT_BEAM, warnRange: 0.3 });

		expect(element.props["aria-label"]).toBe(
			"Lidar scan, 8 of 8 beams returning, nearest obstacle 0.6 meters at 0 degrees",
		);
	});

	it("discards ranges beyond rangeMax as no-returns", () => {
		const element = LidarScan({ rangeMax: 1, ranges: EIGHT_BEAM });

		expect(element.props["aria-label"]).toBe(
			"Lidar scan, 1 of 8 beams returning, nearest obstacle 0.6 meters at 0 degrees, obstacle warning",
		);
	});

	it("discards ranges below rangeMin as no-returns", () => {
		const element = LidarScan({ rangeMin: 1, ranges: EIGHT_BEAM });

		expect(element.props["aria-label"]).toBe(
			"Lidar scan, 7 of 8 beams returning, nearest obstacle 5.0 meters at 180 degrees",
		);
	});

	it("treats non-finite ranges as no-returns", () => {
		const element = LidarScan({
			ranges: [Number.POSITIVE_INFINITY, Number.NaN],
		});

		expect(element.props["aria-label"]).toBe("Lidar scan, no returns from 2 beams");
	});

	it("describes an empty scan", () => {
		const element = LidarScan({ ranges: [] });

		expect(element.props["aria-label"]).toBe("Lidar scan, no scan data");
	});

	it("describes a missing scan", () => {
		const element = LidarScan({});

		expect(element.props["aria-label"]).toBe("Lidar scan, no scan data");
	});

	it("honours an explicit angleMin and angleIncrement", () => {
		// Forward-facing 180° scanner: first beam at −π/2, 45° steps. Beam 3 sits
		// at +π/4 — 45° to port — which is 315° clockwise from straight ahead.
		const element = LidarScan({
			angleIncrement: Math.PI / 4,
			angleMin: -Math.PI / 2,
			ranges: [3, 3, 3, 0.5, 3],
		});

		expect(element.props["aria-label"]).toBe(
			"Lidar scan, 5 of 5 beams returning, nearest obstacle 0.5 meters at 315 degrees, obstacle warning",
		);
	});

	it("accepts a typed array without copying it", () => {
		const element = LidarScan({ ranges: Float32Array.from([4, 4, 4, 4, 4, 4, 4, 4]) });

		expect(element.props["aria-label"]).toBe(
			"Lidar scan, 8 of 8 beams returning, nearest obstacle 4.0 meters at 180 degrees",
		);
	});

	it("keeps the closest beam when downsampling a dense scan", () => {
		// 1080 beams, one narrow obstacle — downsampling must not swallow it.
		const dense = Array.from({ length: 1080 }, () => 8);
		dense[540] = 0.4;
		const element = LidarScan({ ranges: dense });

		expect(element.props["aria-label"]).toContain("nearest obstacle 0.4 meters");
		expect(element.props["aria-label"]).toContain("obstacle warning");
	});

	it("honours a custom label override", () => {
		const element = LidarScan({ label: "Rover 3 lidar", ranges: EIGHT_BEAM });

		expect(element.props["aria-label"]).toBe("Rover 3 lidar");
	});

	it("plots a downsampled hit at its own bearing, not the bucket midpoint", () => {
		// 1080 beams reduce to 360 buckets (stride 3). Beam 4 is 1.333° off the
		// start; the midpoint of its bucket (beams 3-5) sits a full beam away, so
		// a midpoint angle would misreport the bearing.
		const dense = Array.from({ length: 1080 }, () => 8);
		dense[4] = 0.4;
		const element = LidarScan({
			angleIncrement: (2 * Math.PI) / 1080,
			angleMin: 0,
			ranges: dense,
		});

		// Beam 4 → 4 × (360/1080)° = 1.33° counter-clockwise → 359° clockwise.
		expect(element.props["aria-label"]).toContain("nearest obstacle 0.4 meters at 359 degrees");
	});

	it("merges a consumer className over the base size", () => {
		const element = LidarScan({ className: "size-64", ranges: EIGHT_BEAM });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
