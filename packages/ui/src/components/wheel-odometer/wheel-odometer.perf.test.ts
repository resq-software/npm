// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { WheelOdometer } from "./wheel-odometer";

const SIX_WHEELS = Array.from({ length: 6 }, (_unused, index) => ({
	commanded: 1.2,
	label: `W${index}`,
	velocity: 1.1,
}));

describe("WheelOdometer performance", () => {
	it("has no blocking perf violations", () => {
		const el = WheelOdometer({ wheels: SIX_WHEELS });
		const violations = collectRenderedViolations(el, "WheelOdometer");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget at maximum wheel count", () => {
		const eight = Array.from({ length: 8 }, (_unused, index) => ({
			commanded: 1,
			label: `W${index}`,
			velocity: 1,
		}));

		expect(countElementNodes(WheelOdometer({ wheels: eight }))).toBeLessThanOrEqual(80);
	});
});
