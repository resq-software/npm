// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the DepthGauge component — representative
 * dive states for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/depth-gauge/depth-gauge.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { DepthGauge } from "./depth-gauge";

const meta: Meta<typeof DepthGauge> = {
	argTypes: {
		altitudeWarning: { control: { max: 20, min: 0.5, step: 0.5, type: "range" } },
		depth: { control: { max: 200, min: 0, step: 0.5, type: "range" } },
	},
	component: DepthGauge,
	tags: ["autodocs"],
	title: "Instruments/Depth Gauge",
};

export default meta;
type Story = StoryObj<typeof DepthGauge>;

export const AtDepth: Story = {
	args: { depth: 12.4, seabed: 16, target: 12 },
};

export const AtSurface: Story = {
	args: { depth: 0.2, seabed: 16 },
};

export const NearSeabed: Story = {
	args: { depth: 15.2, seabed: 16, target: 15 },
};

export const DeepWater: Story = {
	args: { depth: 148.7, maxDepth: 300, seabed: 260, target: 150 },
};

export const NoSounder: Story = {
	args: { depth: 22.5, maxDepth: 60 },
};

export const NoData: Story = {
	args: {},
};
