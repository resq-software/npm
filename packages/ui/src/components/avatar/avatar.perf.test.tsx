// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { AvatarBadge, AvatarGroup, AvatarGroupCount } from "./avatar";

/**
 * Avatar, AvatarFallback, and AvatarImage wrap Radix primitives that require
 * a provider context, so we cannot call them as plain functions.  We test the
 * sub-components that render plain HTML elements instead.
 */

const subComponents = [
	["AvatarBadge", AvatarBadge, {}],
	["AvatarGroup", AvatarGroup, { children: "test" }],
	["AvatarGroupCount", AvatarGroupCount, { children: "3" }],
] as const;

describe("Avatar performance", () => {
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
