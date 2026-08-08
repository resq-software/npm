// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { type AisPositionReport, aisToContact, aisToContacts, computeApproach } from "./ais";

/** One nautical mile is 1/60 of a degree of latitude. */
const ONE_NM = 1 / 60;

const OWN = { course: 0, latitude: 0, longitude: 0, speed: 10 };

const HEAD_ON: AisPositionReport = {
	cog: 180,
	latitude: ONE_NM,
	longitude: 0,
	mmsi: 200_000_001,
	sog: 10,
};

describe("computeApproach", () => {
	it("solves a head-on collision", () => {
		const approach = computeApproach(OWN, HEAD_ON);

		expect(approach?.cpa).toBeCloseTo(0, 6);
		expect(approach?.tcpa).toBeCloseTo(3, 6);
	});

	it("reports a passing distance for an offset track", () => {
		// Contact one mile north and half a mile east, running south.
		const approach = computeApproach(OWN, {
			cog: 180,
			latitude: ONE_NM,
			longitude: ONE_NM / 2,
			mmsi: 1,
			sog: 10,
		});

		expect(approach?.cpa).toBeCloseTo(0.5, 3);
		expect(approach?.tcpa).toBeCloseTo(3, 3);
	});

	it("treats matched velocities as a constant range", () => {
		const approach = computeApproach(OWN, {
			cog: 0,
			latitude: 0,
			longitude: ONE_NM,
			mmsi: 1,
			sog: 10,
		});

		expect(approach?.cpa).toBeCloseTo(1, 3);
		expect(approach?.tcpa).toBe(0);
	});

	it("clamps an already-passed approach to the present range", () => {
		// Contact ahead and pulling away faster than we are closing.
		const approach = computeApproach(OWN, {
			cog: 0,
			latitude: ONE_NM,
			longitude: 0,
			mmsi: 1,
			sog: 20,
		});

		expect(approach?.tcpa).toBe(0);
		expect(approach?.cpa).toBeCloseTo(1, 3);
	});

	it("returns null when own motion is unknown", () => {
		expect(computeApproach({ latitude: 0, longitude: 0 }, HEAD_ON)).toBeNull();
	});

	it("returns null when the contact reports no motion fields", () => {
		expect(computeApproach(OWN, { latitude: ONE_NM, longitude: 0, mmsi: 1 })).toBeNull();
	});

	it("returns null for an unusable position", () => {
		expect(
			computeApproach(OWN, { cog: 180, latitude: Number.NaN, longitude: 0, mmsi: 1, sog: 10 }),
		).toBeNull();
	});
});

describe("aisToContact", () => {
	it("derives bearing and range from the two positions", () => {
		const contact = aisToContact(HEAD_ON, OWN);

		expect(contact?.bearing).toBeCloseTo(0, 3);
		// On a sphere of mean Earth radius an arcminute of latitude is 1.0007 NM;
		// the round 60-per-degree figure is definitional, not geometric.
		expect(contact?.range).toBeCloseTo(1, 2);
	});

	it("resolves a contact to the east as bearing 090", () => {
		const contact = aisToContact({ latitude: 0, longitude: ONE_NM, mmsi: 1 }, OWN);

		expect(contact?.bearing).toBeCloseTo(90, 3);
	});

	it("carries course and speed through", () => {
		const contact = aisToContact(HEAD_ON, OWN);

		expect(contact?.course).toBe(180);
		expect(contact?.speed).toBe(10);
	});

	it("attaches the approach solution when both vessels report motion", () => {
		const contact = aisToContact(HEAD_ON, OWN);

		expect(contact?.cpa).toBeCloseTo(0, 6);
		expect(contact?.tcpa).toBeCloseTo(3, 6);
	});

	it("omits the approach solution when it cannot be solved", () => {
		const contact = aisToContact({ latitude: ONE_NM, longitude: 0, mmsi: 1 }, OWN);

		expect(contact?.cpa).toBeUndefined();
		expect(contact?.tcpa).toBeUndefined();
	});

	it("prefers the vessel name as the id", () => {
		expect(aisToContact({ ...HEAD_ON, name: "NORDIC STAR" }, OWN)?.id).toBe("NORDIC STAR");
	});

	it("falls back to the MMSI for a blank name", () => {
		expect(aisToContact({ ...HEAD_ON, name: "   " }, OWN)?.id).toBe("200000001");
	});

	it("falls back to the MMSI when no name is reported", () => {
		expect(aisToContact(HEAD_ON, OWN)?.id).toBe("200000001");
	});

	it("returns null for an unusable contact position", () => {
		expect(aisToContact({ latitude: Number.NaN, longitude: 0, mmsi: 1 }, OWN)).toBeNull();
	});

	it("returns null for an unusable own position", () => {
		expect(aisToContact(HEAD_ON, { latitude: Number.NaN, longitude: 0 })).toBeNull();
	});
});

describe("aisToContacts", () => {
	it("maps a batch and preserves order", () => {
		const contacts = aisToContacts(
			[
				{ latitude: 2 * ONE_NM, longitude: 0, mmsi: 1 },
				{ latitude: ONE_NM, longitude: 0, mmsi: 2 },
			],
			OWN,
		);

		expect(contacts.map((c) => c.id)).toEqual(["1", "2"]);
	});

	it("drops unplottable reports instead of failing the batch", () => {
		const contacts = aisToContacts(
			[
				{ latitude: Number.NaN, longitude: 0, mmsi: 1 },
				{ latitude: ONE_NM, longitude: 0, mmsi: 2 },
			],
			OWN,
		);

		expect(contacts).toHaveLength(1);
		expect(contacts[0].id).toBe("2");
	});

	it("returns an empty array when own position is unusable", () => {
		expect(aisToContacts([HEAD_ON], { latitude: Number.NaN, longitude: 0 })).toEqual([]);
	});
});
