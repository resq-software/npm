// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup performance", () => {
	it("RadioGroup has no blocking perf violations", () => {
		const el = RadioGroup({});
		const violations = collectRenderedViolations(el, "RadioGroup");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("RadioGroupItem has no blocking perf violations", () => {
		const el = RadioGroupItem({ value: "a" });
		const violations = collectRenderedViolations(el, "RadioGroupItem");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
