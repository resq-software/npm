// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the BatteryGauge component —
 * representative pack states for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/battery-gauge/battery-gauge.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { BatteryGauge } from "./battery-gauge";

const meta: Meta<typeof BatteryGauge> = {
	argTypes: {
		alertPercentage: { control: { max: 50, min: 1, step: 1, type: "range" } },
		current: { control: { max: 40, min: -40, step: 0.5, type: "range" } },
		percentage: { control: { max: 100, min: 0, step: 1, type: "range" } },
		warnPercentage: { control: { max: 90, min: 5, step: 1, type: "range" } },
	},
	component: BatteryGauge,
	tags: ["autodocs"],
	title: "Instruments/Battery Gauge",
};

export default meta;
type Story = StoryObj<typeof BatteryGauge>;

export const HealthyPack: Story = {
	args: {
		cellVoltages: [4.11, 4.09, 4.12, 4.08, 4.1, 4.11],
		current: -12.4,
		percentage: 78,
		temperature: 34,
		voltage: 24.6,
	},
};

export const Charging: Story = {
	args: {
		cellVoltages: [3.82, 3.83, 3.81, 3.82, 3.84, 3.83],
		current: 18.6,
		percentage: 46,
		temperature: 29,
		voltage: 22.9,
	},
};

export const CellDiverging: Story = {
	args: {
		cellVoltages: [4.1, 4.09, 3.86, 4.11, 4.08, 4.1],
		current: -14.2,
		percentage: 61,
		temperature: 41,
		voltage: 24.3,
	},
};

export const CriticalCharge: Story = {
	args: {
		cellVoltages: [3.42, 3.4, 3.38, 3.41, 3.39, 3.4],
		current: -21.8,
		percentage: 9,
		temperature: 47,
		voltage: 20.4,
	},
};

export const LargeString: Story = {
	args: {
		cellVoltages: Array.from({ length: 24 }, (_unused, index) =>
			index === 17 ? 3.94 : 4.09 + (index % 3) / 400,
		),
		current: -6.1,
		percentage: 88,
		temperature: 26,
		voltage: 98.2,
	},
};

export const NoCellTelemetry: Story = {
	args: { current: -9.4, percentage: 64, voltage: 24.1 },
};

export const NoData: Story = {
	args: {},
};
