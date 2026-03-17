// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { ResizableHandle } from "./resizable";

describe("Resizable performance", () => {
	it("has no blocking perf violations", () => {
		const el = ResizableHandle({});
		const violations = collectRenderedViolations(el, "ResizableHandle");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
