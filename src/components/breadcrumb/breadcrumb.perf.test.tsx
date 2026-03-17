// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "./breadcrumb";

const subComponents = [
	["Breadcrumb", Breadcrumb, { children: "test" }],
	["BreadcrumbList", BreadcrumbList, { children: "test" }],
	["BreadcrumbItem", BreadcrumbItem, { children: "test" }],
	["BreadcrumbPage", BreadcrumbPage, { children: "test" }],
] as const;

describe("Breadcrumb performance", () => {
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
		expect(countElementNodes(Breadcrumb({ children: "test" }))).toBeLessThanOrEqual(5);
	});
});
