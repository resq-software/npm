// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import * as React from "react";

import { Slider } from "./slider";

const meta: Meta<typeof Slider> = {
	argTypes: {
		max: { control: "number" },
		min: { control: "number" },
		step: { control: "number" },
	},
	component: Slider,
	tags: ["autodocs"],
	title: "Forms/Slider",
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
	args: { className: "w-64", defaultValue: [50], max: 100, step: 1 },
};

export const Range: Story = {
	args: { className: "w-64", defaultValue: [25, 75], max: 100, step: 1 },
};

export const Disabled: Story = {
	args: { className: "w-64", defaultValue: [40], disabled: true, max: 100 },
};

export const WithLabel: Story = {
	render: () => {
		const [value, setValue] = React.useState([5]);
		return (
			<div className="grid gap-3 w-72">
				<div className="flex justify-between text-sm">
					<span className="font-medium">Drone altitude limit</span>
					<span className="text-muted-foreground">{value[0]} km</span>
				</div>
				<Slider max={12} min={0} onValueChange={setValue} step={0.5} value={value} />
				<p className="text-xs text-muted-foreground">Maximum 12 km for extended-range units.</p>
			</div>
		);
	},
};

export const RangeWithLabel: Story = {
	render: () => {
		const [range, setRange] = React.useState([20, 80]);
		return (
			<div className="grid gap-3 w-72">
				<div className="flex justify-between text-sm">
					<span className="font-medium">Altitude range</span>
					<span className="text-muted-foreground">
						{range[0]}–{range[1]} m
					</span>
				</div>
				<Slider max={150} min={0} onValueChange={setRange} step={5} value={range} />
			</div>
		);
	},
};
