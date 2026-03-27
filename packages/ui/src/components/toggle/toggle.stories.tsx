// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { TextBolderIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

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
		<Toggle aria-label="Toggle bold" {...args}>
			<TextBolderIcon />
		</Toggle>
	),
};

export const Outline: Story = {
	args: { variant: "outline" },
	render: (args) => (
		<Toggle aria-label="Toggle bold" {...args}>
			<TextBolderIcon />
		</Toggle>
	),
};

export const WithText: Story = {
	render: () => (
		<Toggle>
			<TextBolderIcon />
			Bold
		</Toggle>
	),
};

export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => (
		<Toggle aria-label="Toggle bold" {...args}>
			<TextBolderIcon />
		</Toggle>
	),
};
