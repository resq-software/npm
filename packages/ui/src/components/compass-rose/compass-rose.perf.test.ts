// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { CompassRose } from "./compass-rose";

describe("CompassRose performance", () => {
	it("has no blocking perf violations", () => {
		const el = CompassRose({ course: 48, heading: 42, speed: 6.2 });
		const violations = collectRenderedViolations(el, "CompassRose");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget", () => {
		expect(
			countElementNodes(CompassRose({ course: 48, heading: 42, speed: 6.2 })),
		).toBeLessThanOrEqual(80);
	});

	it("reuses the static rose across readings", () => {
		expect(countElementNodes(CompassRose({ course: 200, heading: 180, speed: 11 }))).toBe(
			countElementNodes(CompassRose({ course: 48, heading: 42, speed: 6.2 })),
		);
	});
});
