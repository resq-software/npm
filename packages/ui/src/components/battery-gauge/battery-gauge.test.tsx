// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { BatteryGauge } from "./battery-gauge";

const PACK = {
	cellVoltages: [4.11, 4.09, 4.12, 4.08],
	current: -12.4,
	percentage: 78,
	temperature: 34,
	voltage: 24.6,
};

describe("BatteryGauge", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = BatteryGauge(PACK);

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("battery-gauge");
	});

	it("narrates the full pack state", () => {
		const element = BatteryGauge(PACK);

		expect(element.props["aria-label"]).toBe(
			"Battery, 78 percent, 24.6 volts, discharging 12.4 amps, 34 degrees Celsius, 4 cells, 40 millivolt spread",
		);
	});

	it("reads a positive current as charging", () => {
		const element = BatteryGauge({ current: 8.2, percentage: 42 });

		expect(element.props["aria-label"]).toBe("Battery, 42 percent, charging 8.2 amps");
	});

	it("reads a negligible current as no flow", () => {
		const element = BatteryGauge({ current: 0, percentage: 42 });

		expect(element.props["aria-label"]).toBe("Battery, 42 percent, no current flow");
	});

	it("omits readings that were not supplied", () => {
		const element = BatteryGauge({ percentage: 55 });

		expect(element.props["aria-label"]).toBe("Battery, 55 percent");
	});

	it("describes an entirely empty pack reading", () => {
		expect(BatteryGauge({}).props["aria-label"]).toBe("Battery, no data");
	});

	it("ignores non-finite readings rather than printing NaN", () => {
		const element = BatteryGauge({
			current: Number.NaN,
			percentage: Number.POSITIVE_INFINITY,
			voltage: 24.6,
		});

		expect(element.props["aria-label"]).toBe("Battery, 24.6 volts");
	});

	it("clamps state of charge into 0 to 100", () => {
		expect(BatteryGauge({ percentage: 140 }).props["aria-label"]).toBe("Battery, 100 percent");
		expect(BatteryGauge({ percentage: -20 }).props["aria-label"]).toBe("Battery, 0 percent");
	});

	it("reports the cell spread in millivolts", () => {
		const element = BatteryGauge({ cellVoltages: [3.95, 4.0, 3.98] });

		expect(element.props["aria-label"]).toBe("Battery, 3 cells, 50 millivolt spread");
	});

	it("drops non-finite cells before computing the spread", () => {
		const element = BatteryGauge({ cellVoltages: [4.0, Number.NaN, 4.05] });

		expect(element.props["aria-label"]).toBe("Battery, 2 cells, 50 millivolt spread");
	});

	it("declares the truncation past twenty-four cells", () => {
		const many = Array.from({ length: 30 }, () => 4);
		const element = BatteryGauge({ cellVoltages: many });

		expect(element.props["aria-label"]).toBe("Battery, showing 24 of 30 cells, 0 millivolt spread");
	});

	it("treats an empty cell array as no cell data", () => {
		const element = BatteryGauge({ cellVoltages: [], percentage: 60 });

		expect(element.props["aria-label"]).toBe("Battery, 60 percent");
	});

	it("honours a custom label override", () => {
		const element = BatteryGauge({ ...PACK, label: "Rover 3 pack" });

		expect(element.props["aria-label"]).toBe("Rover 3 pack");
	});

	it("merges a consumer className over the base size", () => {
		const element = BatteryGauge({ ...PACK, className: "size-64" });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
