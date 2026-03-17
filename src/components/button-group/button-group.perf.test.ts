// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { ButtonGroup, buttonGroupVariants } from "./button-group";

describe("ButtonGroup performance", () => {
	it("has no blocking perf violations", () => {
		const el = ButtonGroup({});
		const violations = collectRenderedViolations(el, "ButtonGroup");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("buttonGroupVariants horizontal has no transition-all", () => {
		const classes = buttonGroupVariants({ orientation: "horizontal" });
		assertRenderedNoTransitionAll(classes, "buttonGroupVariants(horizontal)");
		assertRenderedNoGenericRadius(classes, "buttonGroupVariants(horizontal)");
	});

	it("buttonGroupVariants vertical has no transition-all", () => {
		const classes = buttonGroupVariants({ orientation: "vertical" });
		assertRenderedNoTransitionAll(classes, "buttonGroupVariants(vertical)");
		assertRenderedNoGenericRadius(classes, "buttonGroupVariants(vertical)");
	});
});
