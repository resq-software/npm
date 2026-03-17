// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Separator } from "./separator";

describe("Separator performance", () => {
	it("has no blocking perf violations", () => {
		const el = Separator({});
		const violations = collectRenderedViolations(el, "Separator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Separator({}))).toBeLessThanOrEqual(3);
	});
});
