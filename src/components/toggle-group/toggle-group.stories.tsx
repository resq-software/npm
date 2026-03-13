// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta: Meta<typeof ToggleGroup> = {
	argTypes: {
		size: { control: "select", options: ["default", "sm", "lg"] },
		type: { control: "select", options: ["single", "multiple"] },
		variant: { control: "select", options: ["default", "outline"] },
	},
	component: ToggleGroup,
	tags: ["autodocs"],
	title: "Utilities/Toggle Group",
};

export default meta;
type Story = StoryObj<typeof ToggleGroup>;

export const Default: Story = {
	args: { type: "multiple" },
	render: (args) => (
		<ToggleGroup {...args}>
			<ToggleGroupItem value="bold">
				<BoldIcon />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic">
				<ItalicIcon />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline">
				<UnderlineIcon />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Outline: Story = {
	args: { type: "single", variant: "outline" },
	render: (args) => (
		<ToggleGroup {...args}>
			<ToggleGroupItem value="bold">
				<BoldIcon />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic">
				<ItalicIcon />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline">
				<UnderlineIcon />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Vertical: Story = {
	args: { orientation: "vertical", type: "multiple" },
	render: (args) => (
		<ToggleGroup {...args}>
			<ToggleGroupItem value="bold">
				<BoldIcon />
			</ToggleGroupItem>
			<ToggleGroupItem value="italic">
				<ItalicIcon />
			</ToggleGroupItem>
			<ToggleGroupItem value="underline">
				<UnderlineIcon />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};
