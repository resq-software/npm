// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The staleness contract, asserted once across every reading instrument.
 *
 * This is deliberately a single parameterised suite rather than nine copies.
 * The review round that preceded it turned up the same class of defect in
 * several components — hardening applied in one place and forgotten in another
 * — because there was no checklist run over all of them. A tenth instrument
 * that forgets `stale` now fails here rather than shipping quietly.
 *
 * TeleopPad is absent on purpose: it produces commands rather than displaying a
 * reading, so it has nothing that can go stale.
 */

import { describe, expect, it } from "vitest";

import { BatteryGauge } from "../components/battery-gauge/index.js";
import { CompassRose } from "../components/compass-rose/index.js";
import { ContactScope } from "../components/contact-scope/index.js";
import { DepthGauge } from "../components/depth-gauge/index.js";
import { LidarScan } from "../components/lidar-scan/index.js";
import { OccupancyGrid } from "../components/occupancy-grid/index.js";
import { ThrusterRing } from "../components/thruster-ring/index.js";
import { TiltIndicator } from "../components/tilt-indicator/index.js";
import { WheelOdometer } from "../components/wheel-odometer/index.js";
import { collectClassNames, countElementNodes } from "./perf-test-utils";

type Instrument = (props: Record<string, unknown>) => {
	props: Record<string, unknown>;
};

const INSTRUMENTS: readonly (readonly [string, Instrument])[] = [
	["BatteryGauge", BatteryGauge as unknown as Instrument],
	["CompassRose", CompassRose as unknown as Instrument],
	["ContactScope", ContactScope as unknown as Instrument],
	["DepthGauge", DepthGauge as unknown as Instrument],
	["LidarScan", LidarScan as unknown as Instrument],
	["OccupancyGrid", OccupancyGrid as unknown as Instrument],
	["ThrusterRing", ThrusterRing as unknown as Instrument],
	["TiltIndicator", TiltIndicator as unknown as Instrument],
	["WheelOdometer", WheelOdometer as unknown as Instrument],
];

describe("instrument staleness contract", () => {
	it("covers every reading instrument", () => {
		expect(INSTRUMENTS).toHaveLength(9);
	});

	for (const [name, Instrument] of INSTRUMENTS) {
		describe(name, () => {
			it("is not stale by default", () => {
				const element = Instrument({});

				expect(element.props["data-stale"]).toBeUndefined();
				expect(String(element.props["aria-label"])).not.toContain("Stale");
			});

			it("exposes data-stale for consumer styling when stale", () => {
				expect(Instrument({ stale: true }).props["data-stale"]).toBe("");
			});

			it("leads the accessible label with the staleness", () => {
				// Leading, not trailing: an operator must distrust the numbers
				// before hearing them.
				expect(String(Instrument({ stale: true }).props["aria-label"])).toMatch(/^Stale, /);
			});

			it("marks a caller-supplied label stale too", () => {
				// A custom name does not make a frozen reading fresh.
				const element = Instrument({ label: "Rover 3", stale: true });

				expect(element.props["aria-label"]).toBe("Stale, Rover 3");
			});

			it("dims the figure and shows a badge when stale", () => {
				const fresh = Instrument({});
				const stale = Instrument({ stale: true });

				expect(collectClassNames(stale)).toContain("opacity-45");
				expect(collectClassNames(fresh)).not.toContain("opacity-45");
				expect(countElementNodes(stale)).toBeGreaterThan(countElementNodes(fresh));
			});

			it("costs nothing when fresh", () => {
				// The badge must not be rendered-then-hidden.
				expect(collectClassNames(Instrument({}))).not.toContain("Stale");
			});
		});
	}
});
