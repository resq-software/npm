// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	collectRenderedViolations,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { AspectRatio } from "./aspect-ratio";

/**
 * AspectRatio wraps Radix AspectRatioPrimitive.Root.  We verify the data-slot
 * attribute is forwarded for Element Timing tracking.  The component has no
 * class strings to check for transition or radius issues.
 */

describe("AspectRatio performance", () => {
	it("has no blocking perf violations", () => {
		const el = AspectRatio({ ratio: 16 / 9 });
		const violations = collectRenderedViolations(el, "AspectRatio");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});
});
