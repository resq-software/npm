// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the ThrusterRing component — thrust
 * patterns covering station-keeping, a hard turn, saturation and a dead feed,
 * for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/thruster-ring/thruster-ring.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { ThrusterRing } from "./thruster-ring";

const meta: Meta<typeof ThrusterRing> = {
	argTypes: {
		saturation: { control: { max: 1, min: 0.5, step: 0.01, type: "range" } },
	},
	component: ThrusterRing,
	tags: ["autodocs"],
	title: "Instruments/Thruster Ring",
};

export default meta;
type Story = StoryObj<typeof ThrusterRing>;

export const StationKeeping: Story = {
	args: {
		thrusters: [
			{ angle: 45, label: "FR", output: 0.18 },
			{ angle: 135, label: "AR", output: -0.14 },
			{ angle: 225, label: "AL", output: -0.16 },
			{ angle: 315, label: "FL", output: 0.2 },
		],
	},
};

export const AheadFull: Story = {
	args: {
		thrusters: [
			{ angle: 45, label: "FR", output: 0.92 },
			{ angle: 135, label: "AR", output: 0.9 },
			{ angle: 225, label: "AL", output: 0.91 },
			{ angle: 315, label: "FL", output: 0.93 },
		],
	},
};

export const HardTurnWithSaturation: Story = {
	args: {
		thrusters: [
			{ angle: 45, label: "FR", output: -0.72 },
			{ angle: 135, label: "AR", output: -0.98 },
			{ angle: 225, label: "AL", output: 0.99 },
			{ angle: 315, label: "FL", output: 0.7 },
		],
	},
};

export const VectoredSix: Story = {
	args: {
		thrusters: [
			{ angle: 45, label: "FR", output: 0.62 },
			{ angle: 90, label: "VR", output: 0.22 },
			{ angle: 135, label: "AR", output: -0.4 },
			{ angle: 225, label: "AL", output: -0.38 },
			{ angle: 270, label: "VL", output: 0.24 },
			{ angle: 315, label: "FL", output: 0.6 },
		],
	},
};

export const AutoSpacedEight: Story = {
	args: {
		thrusters: Array.from({ length: 8 }, (_unused, index) => ({
			label: `T${index + 1}`,
			output: Math.sin((index / 8) * Math.PI * 2),
		})),
	},
};

export const NoData: Story = {
	args: { thrusters: [] },
};

/**
 * A frozen reading is more dangerous than a missing one, because it still
 * invites a decision. Dimmed, badged, and announced as stale before its numbers.
 */
export const Stale: Story = {
	args: { ...StationKeeping.args, stale: true },
};
