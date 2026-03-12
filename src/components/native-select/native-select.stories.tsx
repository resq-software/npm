// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Label } from "../label";
import { NativeSelect, NativeSelectOption } from "./native-select";

const meta: Meta<typeof NativeSelect> = {
	argTypes: {
		size: { control: "select", options: ["default", "sm"] },
	},
	component: NativeSelect,
	tags: ["autodocs"],
	title: "Components/NativeSelect",
};

export default meta;
type Story = StoryObj<typeof NativeSelect>;

export const Default: Story = {
	render: (args) => (
		<NativeSelect {...args} className="w-48">
			<NativeSelectOption value="">Select zone…</NativeSelectOption>
			<NativeSelectOption value="4a">Zone 4A</NativeSelectOption>
			<NativeSelectOption value="4b">Zone 4B</NativeSelectOption>
			<NativeSelectOption value="5a">Zone 5A</NativeSelectOption>
			<NativeSelectOption value="5b">Zone 5B</NativeSelectOption>
		</NativeSelect>
	),
};

export const Small: Story = {
	args: { size: "sm" },
	render: (args) => (
		<NativeSelect {...args} className="w-36">
			<NativeSelectOption value="active">Active</NativeSelectOption>
			<NativeSelectOption value="standby">Standby</NativeSelectOption>
			<NativeSelectOption value="closed">Closed</NativeSelectOption>
		</NativeSelect>
	),
};

export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => (
		<NativeSelect {...args} className="w-48">
			<NativeSelectOption value="none">No zones available</NativeSelectOption>
		</NativeSelect>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-48">
			<Label htmlFor="status-select">Mission status</Label>
			<NativeSelect id="status-select">
				<NativeSelectOption value="">All statuses</NativeSelectOption>
				<NativeSelectOption value="active">Active</NativeSelectOption>
				<NativeSelectOption value="standby">Standby</NativeSelectOption>
				<NativeSelectOption value="closed">Closed</NativeSelectOption>
			</NativeSelect>
		</div>
	),
};
