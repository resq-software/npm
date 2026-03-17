// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Kbd, KbdGroup } from "./kbd";

describe("Kbd performance", () => {
	it("has no blocking perf violations", () => {
		const el = Kbd({});
		const violations = collectRenderedViolations(el, "Kbd");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Kbd({}))).toBeLessThanOrEqual(3);
	});
});

describe("KbdGroup performance", () => {
	it("has no blocking perf violations", () => {
		const el = KbdGroup({});
		const violations = collectRenderedViolations(el, "KbdGroup");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(KbdGroup({}))).toBeLessThanOrEqual(3);
	});
});
