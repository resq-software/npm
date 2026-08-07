// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { LidarScan } from "./lidar-scan";

const SPARSE = [5, 5, 5, 5, 0.6, 5, 5, 5];
const DENSE = Array.from({ length: 1080 }, (_unused, index) => 2 + (index % 40) / 10);

describe("LidarScan performance", () => {
	it("has no blocking perf violations", () => {
		const el = LidarScan({ ranges: SPARSE });
		const violations = collectRenderedViolations(el, "LidarScan");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("keeps the element count independent of beam count", () => {
		const sparse = countElementNodes(LidarScan({ ranges: SPARSE }));
		const dense = countElementNodes(LidarScan({ ranges: DENSE }));

		expect(dense).toBe(sparse);
		expect(dense).toBeLessThanOrEqual(40);
	});

	it("has no blocking perf violations on a full-density scan", () => {
		const violations = collectRenderedViolations(LidarScan({ ranges: DENSE }), "LidarScan");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
