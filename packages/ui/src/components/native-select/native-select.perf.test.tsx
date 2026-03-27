// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { NativeSelect, NativeSelectOption } from "./native-select";

describe("NativeSelect performance", () => {
	it("has no blocking perf violations", () => {
		const el = NativeSelect({ children: "test" });
		const violations = collectRenderedViolations(el, "NativeSelect");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(NativeSelect({ children: "test" }))).toBeLessThanOrEqual(5);
	});
});

describe("NativeSelectOption performance", () => {
	it("has no blocking perf violations", () => {
		const el = NativeSelectOption({ children: "opt", value: "1" });
		const violations = collectRenderedViolations(el, "NativeSelectOption");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
