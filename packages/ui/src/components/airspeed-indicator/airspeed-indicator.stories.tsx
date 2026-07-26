// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the AirspeedIndicator component — shows
 * banded and plain dials for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/airspeed-indicator/airspeed-indicator.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { AirspeedIndicator, type SpeedBand } from "./airspeed-indicator";

const DRONE_BANDS: SpeedBand[] = [
	{ from: 30, to: 130, tone: "normal" },
	{ from: 130, to: 175, tone: "caution" },
	{ from: 175, to: 200, tone: "danger" },
];

const meta: Meta<typeof AirspeedIndicator> = {
	args: {
		bands: DRONE_BANDS,
		maxSpeed: 200,
		redline: 185,
		unit: "kt",
	},
	argTypes: {
		speed: { control: { max: 200, min: 0, step: 1, type: "range" } },
	},
	component: AirspeedIndicator,
	tags: ["autodocs"],
	title: "Instruments/Airspeed Indicator",
};

export default meta;
type Story = StoryObj<typeof AirspeedIndicator>;

export const Cruise: Story = {
	args: { speed: 110 },
};

export const Caution: Story = {
	args: { speed: 160 },
};

export const Stopped: Story = {
	args: { speed: 0 },
};

export const PlainDial: Story = {
	args: { bands: [], maxSpeed: 100, redline: undefined, speed: 62, unit: "m/s" },
};

export const OverRange: Story = {
	args: { speed: 260 },
};
