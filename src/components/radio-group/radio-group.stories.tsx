// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Label } from "../label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta: Meta<typeof RadioGroup> = {
	component: RadioGroup,
	tags: ["autodocs"],
	title: "Forms/Radio Group",
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
	render: () => (
		<RadioGroup className="w-48" defaultValue="comfortable">
			<div className="flex items-center gap-2">
				<RadioGroupItem id="r1" value="default" />
				<Label htmlFor="r1">Default</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem id="r2" value="comfortable" />
				<Label htmlFor="r2">Comfortable</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem id="r3" value="compact" />
				<Label htmlFor="r3">Compact</Label>
			</div>
		</RadioGroup>
	),
};

export const Priority: Story = {
	render: () => (
		<div className="grid gap-2 w-64">
			<Label className="font-semibold">Mission priority</Label>
			<RadioGroup defaultValue="high">
				{[
					{
						description: "Immediate life threat — all units respond",
						label: "Critical",
						value: "critical",
					},
					{
						description: "Significant risk — prioritised response",
						label: "High",
						value: "high",
					},
					{
						description: "Moderate urgency — standard response",
						label: "Medium",
						value: "medium",
					},
					{
						description: "Non-urgent — scheduled response",
						label: "Low",
						value: "low",
					},
				].map(({ description, label, value }) => (
					<div className="flex items-start gap-2" key={value}>
						<RadioGroupItem
							className="mt-0.5"
							id={`priority-${value}`}
							value={value}
						/>
						<div>
							<Label className="font-medium" htmlFor={`priority-${value}`}>
								{label}
							</Label>
							<p className="text-xs text-muted-foreground">{description}</p>
						</div>
					</div>
				))}
			</RadioGroup>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<RadioGroup className="w-48" defaultValue="active">
			<div className="flex items-center gap-2">
				<RadioGroupItem id="da" value="active" />
				<Label htmlFor="da">Active</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem disabled id="db" value="archived" />
				<Label htmlFor="db">Archived (locked)</Label>
			</div>
		</RadioGroup>
	),
};
