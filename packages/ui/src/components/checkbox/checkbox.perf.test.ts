// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Checkbox } from "./checkbox";

describe("Checkbox performance", () => {
	it("has no blocking perf violations", () => {
		const el = Checkbox({});
		const violations = collectRenderedViolations(el, "Checkbox");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
