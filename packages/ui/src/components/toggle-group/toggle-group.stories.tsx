// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Toggle Group component — showcases its
 * variants and composition for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/toggle-group/toggle-group.stories
 */

import { TextBolderIcon, TextItalicIcon, TextUnderlineIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

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
			<ToggleGroupItem aria-label="Toggle bold" value="bold">
				<TextBolderIcon />
			</ToggleGroupItem>
			<ToggleGroupItem aria-label="Toggle italic" value="italic">
				<TextItalicIcon />
			</ToggleGroupItem>
			<ToggleGroupItem aria-label="Toggle underline" value="underline">
				<TextUnderlineIcon />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Outline: Story = {
	args: { type: "single", variant: "outline" },
	render: (args) => (
		<ToggleGroup {...args}>
			<ToggleGroupItem aria-label="Toggle bold" value="bold">
				<TextBolderIcon />
			</ToggleGroupItem>
			<ToggleGroupItem aria-label="Toggle italic" value="italic">
				<TextItalicIcon />
			</ToggleGroupItem>
			<ToggleGroupItem aria-label="Toggle underline" value="underline">
				<TextUnderlineIcon />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const Vertical: Story = {
	args: { orientation: "vertical", type: "multiple" },
	render: (args) => (
		<ToggleGroup {...args}>
			<ToggleGroupItem aria-label="Toggle bold" value="bold">
				<TextBolderIcon />
			</ToggleGroupItem>
			<ToggleGroupItem aria-label="Toggle italic" value="italic">
				<TextItalicIcon />
			</ToggleGroupItem>
			<ToggleGroupItem aria-label="Toggle underline" value="underline">
				<TextUnderlineIcon />
			</ToggleGroupItem>
		</ToggleGroup>
	),
};
