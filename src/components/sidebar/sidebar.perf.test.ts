// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { SidebarGroupLabel } from "./sidebar";

describe("Sidebar performance", () => {
	it("has no blocking perf violations", () => {
		const el = SidebarGroupLabel({});
		const violations = collectRenderedViolations(el, "SidebarGroupLabel");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
