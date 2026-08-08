// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the TiltIndicator component —
 * representative ground-vehicle attitude states for visual review and Chromatic
 * regression.
 *
 * @module @resq-systems/ui/components/tilt-indicator/tilt-indicator.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { TiltIndicator } from "./tilt-indicator";

const meta: Meta<typeof TiltIndicator> = {
	argTypes: {
		pitch: { control: { max: 45, min: -45, step: 1, type: "range" } },
		pitchLimit: { control: { max: 45, min: 5, step: 1, type: "range" } },
		roll: { control: { max: 45, min: -45, step: 1, type: "range" } },
		rollLimit: { control: { max: 45, min: 5, step: 1, type: "range" } },
	},
	component: TiltIndicator,
	tags: ["autodocs"],
	title: "Instruments/Tilt Indicator",
};

export default meta;
type Story = StoryObj<typeof TiltIndicator>;

export const Level: Story = {
	args: { pitch: 0, roll: 0 },
};

export const GentleSideSlope: Story = {
	args: { pitch: -4, roll: 12 },
};

export const CautionCombinedTilt: Story = {
	args: { pitch: 14, roll: 16 },
};

export const AtRolloverLimit: Story = {
	args: { pitch: 0, roll: -30 },
};

export const BeyondLimit: Story = {
	args: { pitch: 10, roll: 34 },
};

export const NarrowTrackVehicle: Story = {
	args: { pitch: 6, pitchLimit: 25, roll: 14, rollLimit: 18 },
};
