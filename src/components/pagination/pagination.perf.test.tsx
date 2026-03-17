// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Pagination, PaginationContent, PaginationItem } from "./pagination";

const subComponents = [
	["Pagination", Pagination, { children: "test" }],
	["PaginationContent", PaginationContent, { children: "test" }],
	["PaginationItem", PaginationItem, { children: "test" }],
] as const;

describe("Pagination performance", () => {
	for (const [name, Component, props] of subComponents) {
		it(`${name} has no blocking perf violations`, () => {
			const el = Component(props);
			const violations = collectRenderedViolations(el, name);
			if (hasBlockingViolations(violations)) {
				throw new Error(formatViolationReport(violations));
			}
		});
	}

	it("produces minimal DOM nodes", () => {
		expect(countElementNodes(Pagination({ children: "test" }))).toBeLessThanOrEqual(5);
	});
});
