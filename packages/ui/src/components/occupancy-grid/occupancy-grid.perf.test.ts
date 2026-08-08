// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { OccupancyGrid } from "./occupancy-grid";

const SMALL = Array.from({ length: 64 }, (_unused, index) => (index % 9 === 0 ? 100 : 0));

/** 512×512 with a diagonal wall — the realistic upper end of a costmap. */
function largeMap(): Int8Array {
	const cells = new Int8Array(512 * 512);
	for (let index = 0; index < 512; index += 1) cells[index * 512 + index] = 100;
	return cells;
}

describe("OccupancyGrid performance", () => {
	it("has no blocking perf violations", () => {
		const el = OccupancyGrid({ cells: SMALL, height: 8, width: 8 });
		const violations = collectRenderedViolations(el, "OccupancyGrid");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("keeps the element count independent of map size", () => {
		const small = countElementNodes(OccupancyGrid({ cells: SMALL, height: 8, width: 8 }));
		const large = countElementNodes(OccupancyGrid({ cells: largeMap(), height: 512, width: 512 }));

		expect(large).toBe(small);
		expect(large).toBeLessThanOrEqual(40);
	});

	it("keeps the element count independent of path length", () => {
		const shortPath = Array.from({ length: 4 }, (_unused, index) => ({ x: index, y: index }));
		const longPath = Array.from({ length: 5000 }, (_unused, index) => ({
			x: index / 100,
			y: index / 200,
		}));

		const withShort = countElementNodes(
			OccupancyGrid({ cells: SMALL, height: 8, path: shortPath, width: 8 }),
		);
		const withLong = countElementNodes(
			OccupancyGrid({ cells: SMALL, height: 8, path: longPath, width: 8 }),
		);

		expect(withLong).toBe(withShort);
	});

	it("has no blocking perf violations on a full-size map", () => {
		const el = OccupancyGrid({
			cells: largeMap(),
			height: 512,
			pose: { theta: 0.4, x: 6, y: 9 },
			width: 512,
		});
		const violations = collectRenderedViolations(el, "OccupancyGrid");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
