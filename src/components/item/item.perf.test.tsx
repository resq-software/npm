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
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemTitle,
} from "./item";

const subComponents = [
	["Item", Item, { children: "test" }],
	["ItemMedia", ItemMedia, { children: "test" }],
	["ItemTitle", ItemTitle, { children: "test" }],
	["ItemGroup", ItemGroup, { children: "test" }],
	["ItemContent", ItemContent, { children: "test" }],
	["ItemActions", ItemActions, { children: "test" }],
	["ItemDescription", ItemDescription, { children: "test" }],
	["ItemFooter", ItemFooter, { children: "test" }],
	["ItemHeader", ItemHeader, { children: "test" }],
] as const;

describe("Item performance", () => {
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
		expect(countElementNodes(Item({ children: "test" }))).toBeLessThanOrEqual(5);
	});
});
