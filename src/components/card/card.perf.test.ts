// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const subComponents = [
	["Card", Card],
	["CardHeader", CardHeader],
	["CardTitle", CardTitle],
	["CardDescription", CardDescription],
	["CardContent", CardContent],
	["CardFooter", CardFooter],
] as const;

describe("Card performance", () => {
	for (const [name, Component] of subComponents) {
		it(`${name} has no blocking perf violations`, () => {
			const el = Component({});
			const violations = collectRenderedViolations(el, name, { maxInlineStyles: 1 });
			if (hasBlockingViolations(violations)) {
				throw new Error(formatViolationReport(violations));
			}
		});

		it(`${name} produces minimal DOM nodes`, () => {
			expect(countElementNodes(Component({}))).toBeLessThanOrEqual(3);
		});
	}
});
