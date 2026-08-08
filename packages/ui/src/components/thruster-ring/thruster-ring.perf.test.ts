// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { ThrusterRing } from "./thruster-ring";

const SIX = Array.from({ length: 6 }, (_unused, index) => ({
	angle: index * 60,
	label: `T${index}`,
	output: 0.4,
}));

describe("ThrusterRing performance", () => {
	it("has no blocking perf violations", () => {
		const el = ThrusterRing({ thrusters: SIX });
		const violations = collectRenderedViolations(el, "ThrusterRing");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget at maximum thruster count", () => {
		const twelve = Array.from({ length: 12 }, (_unused, index) => ({
			label: `T${index}`,
			output: 0.5,
		}));

		expect(countElementNodes(ThrusterRing({ thrusters: twelve }))).toBeLessThanOrEqual(60);
	});

	it("caps element growth when handed more thrusters than it renders", () => {
		const twelve = Array.from({ length: 12 }, (_unused, index) => ({
			label: `T${index}`,
			output: 0.5,
		}));
		const fifty = Array.from({ length: 50 }, (_unused, index) => ({
			label: `T${index}`,
			output: 0.5,
		}));

		expect(countElementNodes(ThrusterRing({ thrusters: fifty }))).toBe(
			countElementNodes(ThrusterRing({ thrusters: twelve })),
		);
	});
});
