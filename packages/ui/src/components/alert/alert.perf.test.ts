// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";

const subComponents = [
	["Alert", Alert],
	["AlertAction", AlertAction],
	["AlertDescription", AlertDescription],
	["AlertTitle", AlertTitle],
] as const;

describe("Alert performance", () => {
	for (const [name, Component] of subComponents) {
		it(`${name} has no blocking perf violations`, () => {
			const el = Component({});
			const violations = collectRenderedViolations(el, name);
			if (hasBlockingViolations(violations)) {
				throw new Error(formatViolationReport(violations));
			}
		});

		it(`${name} produces minimal DOM nodes`, () => {
			const el = Component({});
			expect(countElementNodes(el)).toBeLessThanOrEqual(3);
		});
	}
});
