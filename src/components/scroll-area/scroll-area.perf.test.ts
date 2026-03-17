// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { ScrollArea, ScrollBar } from "./scroll-area";

describe("ScrollArea performance", () => {
	it("ScrollArea has no blocking perf violations", () => {
		const el = ScrollArea({});
		const violations = collectRenderedViolations(el, "ScrollArea");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("ScrollBar has no blocking perf violations", () => {
		const el = ScrollBar({});
		const violations = collectRenderedViolations(el, "ScrollBar");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
