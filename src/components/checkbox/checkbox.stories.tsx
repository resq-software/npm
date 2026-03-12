// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Label } from "../label";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
	component: Checkbox,
	tags: ["autodocs"],
	title: "Components/Checkbox",
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Checked: Story = {
	args: { defaultChecked: true },
};

export const Disabled: Story = {
	args: { disabled: true },
};

export const CheckedDisabled: Story = {
	args: { defaultChecked: true, disabled: true },
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
};

export const Form: Story = {
	render: () => (
		<div className="grid gap-3 w-64">
			<p className="text-sm font-medium">Notify me when:</p>
			{[
				{ id: "mission-start", label: "A mission starts" },
				{ checked: true, id: "drone-return", label: "A drone returns to base" },
				{
					checked: true,
					id: "incident-resolved",
					label: "An incident is resolved",
				},
				{ id: "weekly-report", label: "Weekly summary is ready" },
			].map(({ checked, id, label }) => (
				<div className="flex items-center gap-2" key={id}>
					<Checkbox defaultChecked={checked} id={id} />
					<Label htmlFor={id}>{label}</Label>
				</div>
			))}
		</div>
	),
};
