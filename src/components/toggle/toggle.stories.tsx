// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { BoldIcon } from "lucide-react";

import { Toggle } from "./toggle";

const meta: Meta<typeof Toggle> = {
	argTypes: {
		size: { control: "select", options: ["default", "sm", "lg"] },
		variant: { control: "select", options: ["default", "outline"] },
	},
	component: Toggle,
	tags: ["autodocs"],
	title: "Utilities/Toggle",
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
	render: (args) => (
		<Toggle {...args}>
			<BoldIcon />
		</Toggle>
	),
};

export const Outline: Story = {
	args: { variant: "outline" },
	render: (args) => (
		<Toggle {...args}>
			<BoldIcon />
		</Toggle>
	),
};

export const WithText: Story = {
	render: () => (
		<Toggle>
			<BoldIcon />
			Bold
		</Toggle>
	),
};

export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => (
		<Toggle {...args}>
			<BoldIcon />
		</Toggle>
	),
};
