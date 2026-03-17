// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Progress } from "./progress";

describe("Progress performance", () => {
	it("has no blocking perf violations", () => {
		const el = Progress({ value: 50 });
		const violations = collectRenderedViolations(el, "Progress", { maxInlineStyles: 1 });
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Progress({ value: 50 }))).toBeLessThanOrEqual(3);
	});
});
