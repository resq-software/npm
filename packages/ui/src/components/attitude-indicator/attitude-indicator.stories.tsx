// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the AttitudeIndicator component —
 * showcases representative flight attitudes for visual review and Chromatic
 * regression.
 *
 * @module @resq-systems/ui/components/attitude-indicator/attitude-indicator.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { AttitudeIndicator } from "./attitude-indicator";

const meta: Meta<typeof AttitudeIndicator> = {
	argTypes: {
		pitch: { control: { max: 90, min: -90, step: 1, type: "range" } },
		roll: { control: { max: 180, min: -180, step: 1, type: "range" } },
	},
	component: AttitudeIndicator,
	tags: ["autodocs"],
	title: "Instruments/Attitude Indicator",
};

export default meta;
type Story = StoryObj<typeof AttitudeIndicator>;

export const Level: Story = {
	args: { pitch: 0, roll: 0 },
};

export const Climbing: Story = {
	args: { pitch: 12, roll: 0 },
};

export const RightBank: Story = {
	args: { pitch: 4, roll: 20 },
};

export const DescendingLeftBank: Story = {
	args: { pitch: -8, roll: -30 },
};

export const SteepTurn: Story = {
	args: { pitch: 6, roll: 45 },
};

export const Sizes: Story = {
	render: () => (
		<div className="flex items-end gap-6">
			<AttitudeIndicator className="size-24" pitch={5} roll={-12} />
			<AttitudeIndicator className="size-40" pitch={5} roll={-12} />
			<AttitudeIndicator className="size-56" pitch={5} roll={-12} />
		</div>
	),
};

export const FleetAttitudes: Story = {
	render: () => (
		<div className="grid grid-cols-3 gap-6">
			{[
				{ label: "Hover", pitch: 0, roll: 0 },
				{ label: "Ascent", pitch: 18, roll: 0 },
				{ label: "Bank right", pitch: 3, roll: 25 },
				{ label: "Bank left", pitch: 3, roll: -25 },
				{ label: "Descent", pitch: -14, roll: 0 },
				{ label: "Steep turn", pitch: 8, roll: 52 },
			].map(({ label, pitch, roll }) => (
				<div className="grid justify-items-center gap-2" key={label}>
					<AttitudeIndicator className="size-32" pitch={pitch} roll={roll} />
					<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint">
						{label}
					</span>
				</div>
			))}
		</div>
	),
};
