// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Skeleton } from "./skeleton";

describe("Skeleton performance", () => {
	it("has no blocking perf violations", () => {
		const el = Skeleton({});
		const violations = collectRenderedViolations(el, "Skeleton");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Skeleton({}))).toBeLessThanOrEqual(3);
	});
});
