// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the CompassRose component — heading and
 * course combinations that exercise drift, the north crossover and missing
 * sensors, for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/compass-rose/compass-rose.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { CompassRose } from "./compass-rose";

const meta: Meta<typeof CompassRose> = {
	argTypes: {
		course: { control: { max: 359, min: 0, step: 1, type: "range" } },
		heading: { control: { max: 359, min: 0, step: 1, type: "range" } },
		speed: { control: { max: 20, min: 0, step: 0.1, type: "range" } },
	},
	component: CompassRose,
	tags: ["autodocs"],
	title: "Instruments/Compass Rose",
};

export default meta;
type Story = StoryObj<typeof CompassRose>;

export const OnCourse: Story = {
	args: { course: 42, heading: 42, speed: 6.2 },
};

export const StarboardDrift: Story = {
	args: { course: 48, heading: 42, speed: 6.2 },
};

export const StrongPortSet: Story = {
	args: { course: 288, heading: 310, speed: 4.1 },
};

export const NorthCrossover: Story = {
	args: { course: 5, heading: 355, speed: 8.4 },
};

export const StoppedInCurrent: Story = {
	args: { course: 190, heading: 90, speed: 0.6 },
};

export const HeadingOnly: Story = {
	args: { heading: 128 },
};

export const NoData: Story = {
	args: {},
};

/**
 * A frozen reading is more dangerous than a missing one, because it still
 * invites a decision. Dimmed, badged, and announced as stale before its numbers.
 */
export const Stale: Story = {
	args: { ...OnCourse.args, stale: true },
};
