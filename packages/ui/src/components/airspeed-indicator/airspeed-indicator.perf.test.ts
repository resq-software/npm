// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { AirspeedIndicator } from "./airspeed-indicator";

describe("AirspeedIndicator performance", () => {
	it("has no blocking perf violations", () => {
		const el = AirspeedIndicator({
			bands: [
				{ from: 30, to: 130, tone: "normal" },
				{ from: 130, to: 175, tone: "caution" },
			],
			redline: 185,
			speed: 120,
		});
		const violations = collectRenderedViolations(el, "AirspeedIndicator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(countElementNodes(AirspeedIndicator({ speed: 100 }))).toBeLessThanOrEqual(90);
	});
});
