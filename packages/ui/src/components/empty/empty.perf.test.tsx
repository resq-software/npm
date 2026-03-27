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
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./empty";

const subComponents = [
	["Empty", Empty, { children: "test" }],
	["EmptyHeader", EmptyHeader, { children: "test" }],
	["EmptyMedia", EmptyMedia, { children: "test" }],
	["EmptyContent", EmptyContent, { children: "test" }],
	["EmptyDescription", EmptyDescription, { children: "test" }],
	["EmptyTitle", EmptyTitle, { children: "test" }],
] as const;

describe("Empty performance", () => {
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
		expect(countElementNodes(Empty({ children: "test" }))).toBeLessThanOrEqual(5);
	});
});
