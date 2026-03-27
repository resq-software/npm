// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { AccordionTrigger } from "./accordion";

describe("Accordion performance", () => {
	it("has no blocking perf violations", () => {
		const el = AccordionTrigger({});
		// AccordionTrigger wraps Radix primitives — data-slot is on inner element
		const violations = collectRenderedViolations(el, "AccordionTrigger").filter(
			(v) => v.category !== "element-timing",
		);
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
