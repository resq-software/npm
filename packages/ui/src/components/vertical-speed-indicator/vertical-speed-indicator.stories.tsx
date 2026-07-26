// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the VerticalSpeedIndicator component —
 * representative climb / descent rates for visual review and Chromatic
 * regression.
 *
 * @module @resq-systems/ui/components/vertical-speed-indicator/vertical-speed-indicator.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { VerticalSpeedIndicator } from "./vertical-speed-indicator";

const meta: Meta<typeof VerticalSpeedIndicator> = {
	argTypes: {
		verticalSpeed: { control: { max: 2000, min: -2000, step: 50, type: "range" } },
	},
	component: VerticalSpeedIndicator,
	tags: ["autodocs"],
	title: "Instruments/Vertical Speed Indicator",
};

export default meta;
type Story = StoryObj<typeof VerticalSpeedIndicator>;

export const Level: Story = {
	args: { verticalSpeed: 0 },
};

export const Climb: Story = {
	args: { verticalSpeed: 750 },
};

export const SteepClimb: Story = {
	args: { verticalSpeed: 1800 },
};

export const Descent: Story = {
	args: { verticalSpeed: -1200 },
};

export const Ladder: Story = {
	render: () => (
		<div className="flex items-end gap-6">
			{[-1500, -500, 0, 500, 1500].map((verticalSpeed) => (
				<div className="grid justify-items-center gap-2" key={verticalSpeed}>
					<VerticalSpeedIndicator className="size-28" verticalSpeed={verticalSpeed} />
					<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint">
						{verticalSpeed} fpm
					</span>
				</div>
			))}
		</div>
	),
};
