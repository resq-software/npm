// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { TurnCoordinator } from "./turn-coordinator";

describe("TurnCoordinator performance", () => {
	it("has no blocking perf violations", () => {
		const el = TurnCoordinator({ slip: 0.2, turn: 18 });
		const violations = collectRenderedViolations(el, "TurnCoordinator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(countElementNodes(TurnCoordinator({ slip: 0, turn: 0 }))).toBeLessThanOrEqual(50);
	});
});
