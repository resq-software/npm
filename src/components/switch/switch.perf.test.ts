// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Switch } from "./switch";

describe("Switch performance", () => {
	it("has no blocking perf violations", () => {
		const el = Switch({});
		const violations = collectRenderedViolations(el, "Switch");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
