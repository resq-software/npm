// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import { ContactScope } from "./contact-scope";

const TRAFFIC = [
	{ bearing: 120, course: 300, cpa: 2.4, id: "BRAVO", range: 3.4, speed: 8, tcpa: 22 },
	{ bearing: 45, course: 210, cpa: 0.3, id: "ALFA", range: 1.2, speed: 12, tcpa: 8 },
];

/** A busy shipping lane — well past the render cap. */
const CROWDED = Array.from({ length: 800 }, (_unused, index) => ({
	bearing: (index * 37) % 360,
	course: (index * 53) % 360,
	id: `T${index}`,
	range: 0.5 + (index % 55) / 10,
	speed: 4 + (index % 12),
}));

describe("ContactScope performance", () => {
	it("has no blocking perf violations", () => {
		const el = ContactScope({ contacts: TRAFFIC, heading: 310 });
		const violations = collectRenderedViolations(el, "ContactScope");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("has no blocking perf violations in heavy traffic", () => {
		const violations = collectRenderedViolations(
			ContactScope({ contacts: CROWDED, heading: 310 }),
			"ContactScope",
		);
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("stays within the element budget at the contact cap", () => {
		expect(countElementNodes(ContactScope({ contacts: CROWDED }))).toBeLessThanOrEqual(160);
	});

	it("caps element growth beyond the render limit", () => {
		const capped = CROWDED.slice(0, 48).map((contact, index) => ({
			...contact,
			range: 0.5 + index / 100,
		}));

		expect(countElementNodes(ContactScope({ contacts: CROWDED }))).toBe(
			countElementNodes(ContactScope({ contacts: capped })),
		);
	});
});
