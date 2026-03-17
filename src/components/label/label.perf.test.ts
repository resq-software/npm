// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Label } from "./label";

describe("Label performance", () => {
	it("has no blocking perf violations", () => {
		const el = Label({});
		const violations = collectRenderedViolations(el, "Label");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Label({}))).toBeLessThanOrEqual(3);
	});
});
