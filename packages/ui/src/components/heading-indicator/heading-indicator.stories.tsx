// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the HeadingIndicator component —
 * showcases representative headings for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/heading-indicator/heading-indicator.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { HeadingIndicator } from "./heading-indicator";

const meta: Meta<typeof HeadingIndicator> = {
	argTypes: {
		heading: { control: { max: 360, min: 0, step: 1, type: "range" } },
	},
	component: HeadingIndicator,
	tags: ["autodocs"],
	title: "Instruments/Heading Indicator",
};

export default meta;
type Story = StoryObj<typeof HeadingIndicator>;

export const North: Story = {
	args: { heading: 0 },
};

export const Northeast: Story = {
	args: { heading: 45 },
};

export const East: Story = {
	args: { heading: 90 },
};

export const Southwest: Story = {
	args: { heading: 225 },
};

export const CompassRose: Story = {
	render: () => (
		<div className="grid grid-cols-4 gap-6">
			{[
				{ label: "N", heading: 0 },
				{ label: "E", heading: 90 },
				{ label: "S", heading: 180 },
				{ label: "W", heading: 270 },
			].map(({ heading, label }) => (
				<div className="grid justify-items-center gap-2" key={label}>
					<HeadingIndicator className="size-32" heading={heading} />
					<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint">
						{label}
					</span>
				</div>
			))}
		</div>
	),
};
