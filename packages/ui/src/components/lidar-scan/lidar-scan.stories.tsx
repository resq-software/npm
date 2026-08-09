// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the LidarScan component — synthetic scans
 * covering open ground, a corridor, a close obstacle and a dead sensor, for
 * visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/lidar-scan/lidar-scan.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { LidarScan } from "./lidar-scan";

/** 360 beams, one per degree, generated from a radius function. */
function sweep(radiusAt: (degrees: number) => number): number[] {
	return Array.from({ length: 360 }, (_unused, index) => radiusAt(index - 180));
}

const OPEN_GROUND = sweep(() => 9.5);

const CORRIDOR = sweep((deg) => {
	const rad = (deg * Math.PI) / 180;
	const lateral = Math.abs(Math.sin(rad));
	return lateral < 0.05 ? 9.5 : Math.min(9.5, 1.6 / lateral);
});

const OBSTACLE_AHEAD = sweep((deg) => (Math.abs(deg) < 12 ? 0.7 : 6));

const PARTIAL_RETURN = sweep((deg) =>
	deg > 40 ? Number.POSITIVE_INFINITY : 4 + Math.cos((deg * Math.PI) / 90),
);

const meta: Meta<typeof LidarScan> = {
	argTypes: {
		rangeMax: { control: { max: 30, min: 1, step: 1, type: "range" } },
		warnRange: { control: { max: 5, min: 0.1, step: 0.1, type: "range" } },
	},
	component: LidarScan,
	tags: ["autodocs"],
	title: "Instruments/Lidar Scan",
};

export default meta;
type Story = StoryObj<typeof LidarScan>;

export const OpenGround: Story = {
	args: { ranges: OPEN_GROUND },
};

export const Corridor: Story = {
	args: { ranges: CORRIDOR },
};

export const ObstacleAhead: Story = {
	args: { ranges: OBSTACLE_AHEAD },
};

export const PartialReturns: Story = {
	args: { ranges: PARTIAL_RETURN },
};

export const ForwardFacingSector: Story = {
	args: {
		angleIncrement: Math.PI / 180,
		angleMin: -Math.PI / 2,
		ranges: Array.from({ length: 181 }, (_unused, index) => 3 + Math.sin(index / 12)),
	},
};

export const NoReturns: Story = {
	args: { ranges: Array.from({ length: 360 }, () => Number.POSITIVE_INFINITY) },
};

/**
 * A frozen reading is more dangerous than a missing one, because it still
 * invites a decision. Dimmed, badged, and announced as stale before its numbers.
 */
export const Stale: Story = {
	args: { ...OpenGround.args, stale: true },
};
