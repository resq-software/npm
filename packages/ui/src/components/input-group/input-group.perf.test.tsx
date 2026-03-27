// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { InputGroup, InputGroupAddon } from "./input-group";

describe("InputGroup performance", () => {
	it("has no blocking perf violations", () => {
		const el = InputGroup({ children: "test" });
		const violations = collectRenderedViolations(el, "InputGroup");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(InputGroup({ children: "test" }))).toBeLessThanOrEqual(5);
	});
});

describe("InputGroupAddon performance", () => {
	it("has no blocking perf violations", () => {
		const el = InputGroupAddon({ children: "test" });
		const violations = collectRenderedViolations(el, "InputGroupAddon");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
