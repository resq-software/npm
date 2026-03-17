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
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "./field";

const subComponents = [
	["Field", Field, { children: "test" }],
	["FieldGroup", FieldGroup, { children: "test" }],
	["FieldSet", FieldSet, { children: "test" }],
	["FieldLegend", FieldLegend, { children: "test" }],
	["FieldContent", FieldContent, { children: "test" }],
	["FieldDescription", FieldDescription, { children: "test" }],
	["FieldTitle", FieldTitle, { children: "test" }],
] as const;

describe("Field performance", () => {
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
		expect(countElementNodes(Field({ children: "test" }))).toBeLessThanOrEqual(5);
	});
});
