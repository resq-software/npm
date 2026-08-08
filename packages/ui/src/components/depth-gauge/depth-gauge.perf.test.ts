// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { DepthGauge } from "./depth-gauge";

describe("DepthGauge performance", () => {
	it("has no blocking perf violations", () => {
		const el = DepthGauge({ depth: 12.4, seabed: 16, target: 12 });
		const violations = collectRenderedViolations(el, "DepthGauge");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(
			countElementNodes(DepthGauge({ depth: 12.4, seabed: 16, target: 12 })),
		).toBeLessThanOrEqual(50);
	});
});
