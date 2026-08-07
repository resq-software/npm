// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { ContactScope, type ScopeContact } from "./contact-scope";

const TRAFFIC: readonly ScopeContact[] = [
	{ bearing: 120, course: 300, cpa: 2.4, id: "BRAVO", range: 3.4, speed: 8, tcpa: 22 },
	{ bearing: 45, course: 210, cpa: 0.3, id: "ALFA", range: 1.2, speed: 12, tcpa: 8 },
	{ bearing: 300, id: "CHARLIE", range: 5.1 },
];

describe("ContactScope", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = ContactScope({ contacts: TRAFFIC });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("contact-scope");
	});

	it("reports the nearest contact and the worst approach", () => {
		const element = ContactScope({ contacts: TRAFFIC });

		expect(element.props["aria-label"]).toBe(
			"Contact scope, 3 contacts within 6 NM, nearest ALFA at 1.2 NM bearing 045 degrees, closest point of approach 0.3 NM in 8 minutes for ALFA, collision risk",
		);
	});

	it("omits the collision call when the worst approach clears the alert", () => {
		const element = ContactScope({
			contacts: [{ bearing: 45, cpa: 2.4, id: "ALFA", range: 1.2, tcpa: 30 }],
		});

		expect(element.props["aria-label"]).toBe(
			"Contact scope, 1 contact within 6 NM, nearest ALFA at 1.2 NM bearing 045 degrees, closest point of approach 2.4 NM in 30 minutes for ALFA",
		);
	});

	it("honours a custom cpaAlert", () => {
		const element = ContactScope({
			contacts: [{ bearing: 45, cpa: 2.4, id: "ALFA", range: 1.2 }],
			cpaAlert: 3,
		});

		expect(element.props["aria-label"]).toContain("collision risk");
	});

	it("omits the approach clause when no contact reports a CPA", () => {
		const element = ContactScope({ contacts: [{ bearing: 45, id: "ALFA", range: 1.2 }] });

		expect(element.props["aria-label"]).toBe(
			"Contact scope, 1 contact within 6 NM, nearest ALFA at 1.2 NM bearing 045 degrees",
		);
	});

	it("drops contacts beyond the scope range", () => {
		const element = ContactScope({ contacts: TRAFFIC, rangeMax: 2 });

		expect(element.props["aria-label"]).toBe(
			"Contact scope, 1 contact within 2 NM, nearest ALFA at 1.2 NM bearing 045 degrees, closest point of approach 0.3 NM in 8 minutes for ALFA, collision risk",
		);
	});

	it("drops contacts with unusable bearing or range", () => {
		const element = ContactScope({
			contacts: [
				{ bearing: Number.NaN, id: "GHOST", range: 1 },
				{ bearing: 10, id: "NEGATIVE", range: -4 },
				{ bearing: 20, id: "REAL", range: 2 },
			],
		});

		expect(element.props["aria-label"]).toBe(
			"Contact scope, 1 contact within 6 NM, nearest REAL at 2.0 NM bearing 020 degrees",
		);
	});

	it("uses a custom range unit throughout", () => {
		const element = ContactScope({
			contacts: [{ bearing: 45, id: "ALFA", range: 400 }],
			rangeMax: 1000,
			rangeUnit: "m",
		});

		expect(element.props["aria-label"]).toBe(
			"Contact scope, 1 contact within 1000 m, nearest ALFA at 400.0 m bearing 045 degrees",
		);
	});

	it("declares the truncation past forty-eight contacts", () => {
		const many = Array.from({ length: 60 }, (_unused, index) => ({
			bearing: index * 6,
			id: `T${index}`,
			range: 1 + index / 100,
		}));
		const element = ContactScope({ contacts: many });

		expect(element.props["aria-label"]).toContain("showing 48 of 60 contacts within 6 NM");
	});

	it("keeps the nearest contacts when the cap bites", () => {
		const many = Array.from({ length: 60 }, (_unused, index) => ({
			bearing: index * 6,
			id: `T${index}`,
			// Descending range, so the nearest contact is the last one supplied.
			range: 5.9 - index / 100,
		}));
		const element = ContactScope({ contacts: many });

		expect(element.props["aria-label"]).toContain("nearest T59 at 5.3 NM");
	});

	it("describes an empty traffic picture", () => {
		expect(ContactScope({ contacts: [] }).props["aria-label"]).toBe(
			"Contact scope, no contacts within 6 NM",
		);
		expect(ContactScope({}).props["aria-label"]).toBe("Contact scope, no contacts within 6 NM");
	});

	it("honours a custom label override", () => {
		const element = ContactScope({ contacts: TRAFFIC, label: "USV 1 traffic" });

		expect(element.props["aria-label"]).toBe("USV 1 traffic");
	});

	it("ignores a negative CPA rather than treating it as the closest approach", () => {
		// A negative closest-approach distance is nonsense, not an urgent one.
		const element = ContactScope({
			contacts: [
				{ bearing: 45, cpa: -3, id: "GHOST", range: 1 },
				{ bearing: 90, cpa: 2.4, id: "REAL", range: 2 },
			],
		});

		expect(element.props["aria-label"]).toContain("closest point of approach 2.4 NM for REAL");
		expect(element.props["aria-label"]).not.toContain("collision risk");
		expect(element.props["aria-label"]).not.toContain("-3");
	});

	it("merges a consumer className over the base size", () => {
		const element = ContactScope({ className: "size-64", contacts: TRAFFIC });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
