// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { BatteryGauge } from "./battery-gauge";

describe("BatteryGauge performance", () => {
	it("has no blocking perf violations", () => {
		const el = BatteryGauge({
			cellVoltages: [4.11, 4.09, 4.12, 4.08],
			current: -12.4,
			percentage: 78,
			temperature: 34,
			voltage: 24.6,
		});
		const violations = collectRenderedViolations(el, "BatteryGauge");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget at maximum cell count", () => {
		const cells = Array.from({ length: 24 }, (_unused, index) => 4 + index / 1000);

		expect(
			countElementNodes(BatteryGauge({ cellVoltages: cells, percentage: 80 })),
		).toBeLessThanOrEqual(80);
	});

	it("caps element growth when handed more cells than it renders", () => {
		const twentyFour = Array.from({ length: 24 }, () => 4);
		const hundred = Array.from({ length: 100 }, () => 4);

		expect(countElementNodes(BatteryGauge({ cellVoltages: hundred }))).toBe(
			countElementNodes(BatteryGauge({ cellVoltages: twentyFour })),
		);
	});
});
