// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Textarea } from "./textarea";

describe("Textarea performance", () => {
	it("has no blocking perf violations", () => {
		const el = Textarea({});
		const violations = collectRenderedViolations(el, "Textarea");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Textarea({}))).toBeLessThanOrEqual(5);
	});
});
