// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { AttitudeIndicator } from "./attitude-indicator";

describe("AttitudeIndicator performance", () => {
	it("has no blocking perf violations", () => {
		const el = AttitudeIndicator({ pitch: 12, roll: 20 });
		const violations = collectRenderedViolations(el, "AttitudeIndicator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(countElementNodes(AttitudeIndicator({ pitch: 0, roll: 0 }))).toBeLessThanOrEqual(120);
	});
});
