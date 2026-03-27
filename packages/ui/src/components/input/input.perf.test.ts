// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Input } from "./input";

describe("Input performance", () => {
	it("has no blocking perf violations", () => {
		const el = Input({});
		const violations = collectRenderedViolations(el, "Input");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Input({}))).toBeLessThanOrEqual(3);
	});
});
