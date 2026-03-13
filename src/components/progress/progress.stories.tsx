// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
	argTypes: {
		value: { control: { max: 100, min: 0, type: "range" } },
	},
	component: Progress,
	tags: ["autodocs"],
	title: "Display/Progress",
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
	args: { value: 60 },
};

export const Zero: Story = {
	args: { value: 0 },
};

export const Full: Story = {
	args: { value: 100 },
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-72">
			<div className="flex justify-between text-sm">
				<span className="font-medium">Zone coverage</span>
				<span className="text-muted-foreground">68%</span>
			</div>
			<Progress value={68} />
		</div>
	),
};

export const MultipleSteps: Story = {
	render: () => (
		<div className="grid gap-4 w-72">
			{[
				{ label: "Ground survey", value: 100 },
				{ label: "Aerial coverage", value: 74 },
				{ label: "Survivor search", value: 45 },
				{ label: "Medical triage", value: 12 },
			].map(({ label, value }) => (
				<div className="grid gap-1.5" key={label}>
					<div className="flex justify-between text-sm">
						<span>{label}</span>
						<span className="text-muted-foreground">{value}%</span>
					</div>
					<Progress value={value} />
				</div>
			))}
		</div>
	),
};
