// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { HeadingIndicator } from "./heading-indicator";

describe("HeadingIndicator performance", () => {
	it("has no blocking perf violations", () => {
		const el = HeadingIndicator({ heading: 135 });
		const violations = collectRenderedViolations(el, "HeadingIndicator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(countElementNodes(HeadingIndicator({ heading: 0 }))).toBeLessThanOrEqual(130);
	});
});
