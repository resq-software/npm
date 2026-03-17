// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import {
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
} from "./dropdown-menu";

const subComponents = [
	["DropdownMenuItem", DropdownMenuItem, { children: "Item" }],
	["DropdownMenuLabel", DropdownMenuLabel, { children: "Label" }],
	["DropdownMenuSeparator", DropdownMenuSeparator, {}],
	["DropdownMenuShortcut", DropdownMenuShortcut, { children: "\u2318K" }],
] as const;

describe("DropdownMenu performance", () => {
	for (const [name, Component, props] of subComponents) {
		it(`${name} has no blocking perf violations`, () => {
			const el = Component(props);
			const violations = collectRenderedViolations(el, name);
			if (hasBlockingViolations(violations)) {
				throw new Error(formatViolationReport(violations));
			}
		});
	}

	it("DropdownMenuItem element count is reasonable", () => {
		const el = DropdownMenuItem({ children: "Item" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(5);
	});

	it("DropdownMenuShortcut element count is reasonable", () => {
		const el = DropdownMenuShortcut({ children: "\u2318K" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(3);
	});
});
