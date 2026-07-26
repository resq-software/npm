// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { VerticalSpeedIndicator } from "./vertical-speed-indicator";

describe("VerticalSpeedIndicator performance", () => {
	it("has no blocking perf violations", () => {
		const el = VerticalSpeedIndicator({ verticalSpeed: 750 });
		const violations = collectRenderedViolations(el, "VerticalSpeedIndicator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(countElementNodes(VerticalSpeedIndicator({ verticalSpeed: 0 }))).toBeLessThanOrEqual(70);
	});
});
