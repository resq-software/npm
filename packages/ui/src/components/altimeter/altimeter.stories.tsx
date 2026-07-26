// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Altimeter component — representative
 * altitudes for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/altimeter/altimeter.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { Altimeter } from "./altimeter";

const meta: Meta<typeof Altimeter> = {
	argTypes: {
		altitude: { control: { max: 20000, min: 0, step: 10, type: "range" } },
	},
	component: Altimeter,
	tags: ["autodocs"],
	title: "Instruments/Altimeter",
};

export default meta;
type Story = StoryObj<typeof Altimeter>;

export const SeaLevel: Story = {
	args: { altitude: 0 },
};

export const LowLevel: Story = {
	args: { altitude: 450 },
};

export const Cruise: Story = {
	args: { altitude: 4250 },
};

export const HighAltitude: Story = {
	args: { altitude: 12800 },
};

export const Ladder: Story = {
	render: () => (
		<div className="grid grid-cols-4 gap-6">
			{[120, 850, 3400, 9600].map((altitude) => (
				<div className="grid justify-items-center gap-2" key={altitude}>
					<Altimeter altitude={altitude} className="size-32" />
					<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint">
						{altitude} ft
					</span>
				</div>
			))}
		</div>
	),
};
