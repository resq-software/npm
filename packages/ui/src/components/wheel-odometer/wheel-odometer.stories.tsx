// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the WheelOdometer component —
 * representative drive states for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/wheel-odometer/wheel-odometer.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { WheelOdometer } from "./wheel-odometer";

const meta: Meta<typeof WheelOdometer> = {
	argTypes: {
		maxVelocity: { control: { max: 6, min: 0.5, step: 0.5, type: "range" } },
		slipAlert: { control: { max: 1, min: 0.1, step: 0.05, type: "range" } },
		slipWarning: { control: { max: 1, min: 0.05, step: 0.05, type: "range" } },
	},
	component: WheelOdometer,
	tags: ["autodocs"],
	title: "Instruments/Wheel Odometer",
};

export default meta;
type Story = StoryObj<typeof WheelOdometer>;

export const TrackingCommand: Story = {
	args: {
		wheels: [
			{ commanded: 1.2, label: "FL", velocity: 1.2 },
			{ commanded: 1.2, label: "FR", velocity: 1.2 },
			{ commanded: 1.2, label: "RL", velocity: 1.2 },
			{ commanded: 1.2, label: "RR", velocity: 1.2 },
		],
	},
};

export const RearLeftSlipping: Story = {
	args: {
		wheels: [
			{ commanded: 1.2, label: "FL", velocity: 1.2 },
			{ commanded: 1.2, label: "FR", velocity: 1.2 },
			{ commanded: 1.2, label: "RL", velocity: 0.3 },
			{ commanded: 1.2, label: "RR", velocity: 1.15 },
		],
	},
};

export const SkidSteerPivot: Story = {
	args: {
		wheels: [
			{ commanded: -1, label: "L", velocity: -0.95 },
			{ commanded: 1, label: "R", velocity: 1.02 },
		],
	},
};

export const SixWheelRocker: Story = {
	args: {
		maxVelocity: 1,
		wheels: [
			{ commanded: 0.6, label: "FL", velocity: 0.58 },
			{ commanded: 0.6, label: "FR", velocity: 0.61 },
			{ commanded: 0.6, label: "ML", velocity: 0.6 },
			{ commanded: 0.6, label: "MR", velocity: 0.59 },
			{ commanded: 0.6, label: "RL", velocity: 0.12 },
			{ commanded: 0.6, label: "RR", velocity: 0.6 },
		],
	},
};

export const Stopped: Story = {
	args: {
		wheels: [
			{ commanded: 0, label: "FL", velocity: 0 },
			{ commanded: 0, label: "FR", velocity: 0 },
			{ commanded: 0, label: "RL", velocity: 0 },
			{ commanded: 0, label: "RR", velocity: 0 },
		],
	},
};

export const NoData: Story = {
	args: { wheels: [] },
};
