// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import {
	AlertDialog,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
} from "./alert-dialog";

const subComponents = [
	["AlertDialog", AlertDialog, {}],
	["AlertDialogHeader", AlertDialogHeader, {}],
	["AlertDialogFooter", AlertDialogFooter, {}],
	["AlertDialogMedia", AlertDialogMedia, {}],
] as const;

describe("AlertDialog performance", () => {
	for (const [name, Component, props] of subComponents) {
		it(`${name} has no blocking perf violations`, () => {
			const el = Component(props);
			const violations = collectRenderedViolations(el, name);
			if (hasBlockingViolations(violations)) {
				throw new Error(formatViolationReport(violations));
			}
		});
	}
});
