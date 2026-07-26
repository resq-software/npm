// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the TurnCoordinator component —
 * representative turn / coordination states for visual review and Chromatic
 * regression.
 *
 * @module @resq-systems/ui/components/turn-coordinator/turn-coordinator.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { TurnCoordinator } from "./turn-coordinator";

const meta: Meta<typeof TurnCoordinator> = {
	argTypes: {
		slip: { control: { max: 1, min: -1, step: 0.1, type: "range" } },
		turn: { control: { max: 30, min: -30, step: 1, type: "range" } },
	},
	component: TurnCoordinator,
	tags: ["autodocs"],
	title: "Instruments/Turn Coordinator",
};

export default meta;
type Story = StoryObj<typeof TurnCoordinator>;

export const WingsLevel: Story = {
	args: { slip: 0, turn: 0 },
};

export const CoordinatedRightTurn: Story = {
	args: { slip: 0, turn: 18 },
};

export const SlippingLeftTurn: Story = {
	args: { slip: -0.6, turn: -18 },
};

export const Skid: Story = {
	args: { slip: 0.7, turn: 12 },
};
