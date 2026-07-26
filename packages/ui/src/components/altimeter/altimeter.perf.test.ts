// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Altimeter } from "./altimeter";

describe("Altimeter performance", () => {
	it("has no blocking perf violations", () => {
		const el = Altimeter({ altitude: 4250 });
		const violations = collectRenderedViolations(el, "Altimeter");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(countElementNodes(Altimeter({ altitude: 0 }))).toBeLessThanOrEqual(100);
	});
});
