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
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
} from "./context-menu";

const subComponents = [
	["ContextMenuItem", ContextMenuItem, { children: "Item" }],
	["ContextMenuLabel", ContextMenuLabel, { children: "Label" }],
	["ContextMenuSeparator", ContextMenuSeparator, {}],
	["ContextMenuShortcut", ContextMenuShortcut, { children: "\u2318K" }],
] as const;

describe("ContextMenu performance", () => {
	for (const [name, Component, props] of subComponents) {
		it(`${name} has no blocking perf violations`, () => {
			const el = Component(props);
			const violations = collectRenderedViolations(el, name);
			if (hasBlockingViolations(violations)) {
				throw new Error(formatViolationReport(violations));
			}
		});
	}

	it("ContextMenuItem element count is reasonable", () => {
		const el = ContextMenuItem({ children: "Item" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(5);
	});

	it("ContextMenuShortcut element count is reasonable", () => {
		const el = ContextMenuShortcut({ children: "\u2318K" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(3);
	});
});
