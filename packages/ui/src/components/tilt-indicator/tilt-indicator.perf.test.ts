// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { TiltIndicator } from "./tilt-indicator";

describe("TiltIndicator performance", () => {
	it("has no blocking perf violations", () => {
		const el = TiltIndicator({ pitch: -4, roll: 12 });
		const violations = collectRenderedViolations(el, "TiltIndicator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(countElementNodes(TiltIndicator({ pitch: 0, roll: 0 }))).toBeLessThanOrEqual(40);
	});
});
