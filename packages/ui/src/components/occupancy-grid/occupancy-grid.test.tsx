// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { OccupancyGrid } from "./occupancy-grid";

/** 8×8 map: fully explored and free apart from one occupied cell. */
function freeMap(): number[] {
	const cells = Array.from({ length: 64 }, () => 0);
	cells[27] = 100;
	return cells;
}

/** 8×8 map whose top half has never been observed. */
function halfUnknownMap(): number[] {
	return Array.from({ length: 64 }, (_unused, index) => (index < 32 ? 0 : -1));
}

describe("OccupancyGrid", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = OccupancyGrid({ cells: freeMap(), height: 8, width: 8 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("occupancy-grid");
	});

	it("reports grid extents, resolution and coverage", () => {
		const element = OccupancyGrid({ cells: freeMap(), height: 8, width: 8 });

		expect(element.props["aria-label"]).toBe(
			"Occupancy grid, 8 by 8 cells at 0.05 meter resolution, 100 percent explored, 2 percent occupied",
		);
	});

	it("counts unobserved cells as unexplored", () => {
		const element = OccupancyGrid({ cells: halfUnknownMap(), height: 8, width: 8 });

		expect(element.props["aria-label"]).toBe(
			"Occupancy grid, 8 by 8 cells at 0.05 meter resolution, 50 percent explored, 0 percent occupied",
		);
	});

	it("honours a custom occupiedThreshold", () => {
		// A uniform 50 map is free at the default threshold of 65, occupied at 40.
		const cells = Array.from({ length: 64 }, () => 50);

		expect(OccupancyGrid({ cells, height: 8, width: 8 }).props["aria-label"]).toContain(
			"0 percent occupied",
		);
		expect(
			OccupancyGrid({ cells, height: 8, occupiedThreshold: 40, width: 8 }).props["aria-label"],
		).toContain("100 percent occupied");
	});

	it("describes the vehicle pose when supplied", () => {
		const element = OccupancyGrid({
			cells: freeMap(),
			height: 8,
			pose: { theta: Math.PI / 2, x: 1.24, y: 3.4 },
			width: 8,
		});

		expect(element.props["aria-label"]).toBe(
			"Occupancy grid, 8 by 8 cells at 0.05 meter resolution, 100 percent explored, 2 percent occupied, vehicle at 1.2 by 3.4 meters heading 90 degrees",
		);
	});

	it("describes the planned path when supplied", () => {
		const element = OccupancyGrid({
			cells: freeMap(),
			height: 8,
			path: [
				{ x: 0, y: 0 },
				{ x: 0.1, y: 0.1 },
				{ x: 0.2, y: 0.3 },
			],
			width: 8,
		});

		expect(element.props["aria-label"]).toContain("planned path of 3 waypoints");
	});

	it("refuses a buffer shorter than width times height", () => {
		const element = OccupancyGrid({ cells: [0, 0, 0], height: 8, width: 8 });

		expect(element.props["aria-label"]).toBe("Occupancy grid, no map data");
	});

	it("refuses a grid with no extents", () => {
		expect(OccupancyGrid({ cells: freeMap() }).props["aria-label"]).toBe(
			"Occupancy grid, no map data",
		);
		expect(OccupancyGrid({ cells: freeMap(), height: 0, width: 8 }).props["aria-label"]).toBe(
			"Occupancy grid, no map data",
		);
	});

	it("describes a missing map", () => {
		expect(OccupancyGrid({}).props["aria-label"]).toBe("Occupancy grid, no map data");
	});

	it("accepts a typed array without copying it", () => {
		const element = OccupancyGrid({
			cells: Int8Array.from(freeMap()),
			height: 8,
			width: 8,
		});

		expect(element.props["aria-label"]).toContain("100 percent explored");
	});

	it("keeps a lone obstacle visible after downsampling a large map", () => {
		// 512×512 reduces to 64×64 blocks; the single occupied cell must survive
		// in the statistics and therefore in the raster.
		const cells = new Int8Array(512 * 512);
		cells[512 * 300 + 401] = 100;
		const element = OccupancyGrid({ cells, height: 512, width: 512 });

		expect(element.props["aria-label"]).toContain("100 percent explored");
		expect(element.props["aria-label"]).toContain("0 percent occupied");
	});

	it("falls back to the default resolution for non-positive input", () => {
		const element = OccupancyGrid({ cells: freeMap(), height: 8, resolution: 0, width: 8 });

		expect(element.props["aria-label"]).toContain("0.05 meter resolution");
	});

	it("honours a custom label override", () => {
		const element = OccupancyGrid({ cells: freeMap(), height: 8, label: "Rover 3 map", width: 8 });

		expect(element.props["aria-label"]).toBe("Rover 3 map");
	});

	it("merges a consumer className over the base size", () => {
		const element = OccupancyGrid({
			cells: freeMap(),
			className: "size-64",
			height: 8,
			width: 8,
		});

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
