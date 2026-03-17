// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Spinner } from "./spinner";

describe("Spinner performance", () => {
	it("has no blocking perf violations", () => {
		const el = Spinner({});
		// Spinner renders a Lucide icon — data-slot is not applicable
		const violations = collectRenderedViolations(el, "Spinner").filter(
			(v) => v.category !== "element-timing",
		);
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Spinner({}))).toBeLessThanOrEqual(3);
	});
});
