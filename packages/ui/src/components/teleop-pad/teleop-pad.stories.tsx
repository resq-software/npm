// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the TeleopPad component — deadman and
 * latching modes, engineering-unit readouts and the disabled state, for visual
 * review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/teleop-pad/teleop-pad.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { TeleopPad } from "./teleop-pad";

const meta: Meta<typeof TeleopPad> = {
	argTypes: {
		angularScale: { control: { max: 6, min: 0.5, step: 0.5, type: "range" } },
		keyboardStep: { control: { max: 0.5, min: 0.01, step: 0.01, type: "range" } },
		linearScale: { control: { max: 6, min: 0.5, step: 0.5, type: "range" } },
	},
	component: TeleopPad,
	tags: ["autodocs"],
	title: "Instruments/Teleop Pad",
};

export default meta;
type Story = StoryObj<typeof TeleopPad>;

export const Deadman: Story = {
	args: {},
};

export const Latching: Story = {
	args: { defaultValue: { angular: 0.35, linear: 0.6 }, returnToCenter: false },
};

export const EngineeringUnits: Story = {
	args: {
		angularScale: 2,
		defaultValue: { angular: -0.4, linear: 0.8 },
		linearScale: 1.5,
		returnToCenter: false,
	},
};

export const FullReverseTurn: Story = {
	args: { defaultValue: { angular: -1, linear: -1 }, returnToCenter: false },
};

export const Disabled: Story = {
	args: { defaultValue: { angular: 0.2, linear: 0.4 }, disabled: true },
};
