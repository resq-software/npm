// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import {
	ListIcon,
	TextAlignCenterIcon,
	TextAlignLeftIcon,
	TextAlignRightIcon,
	TextBIcon,
	TextItalicIcon,
	TextUnderlineIcon,
} from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "./button-group";

const meta: Meta<typeof ButtonGroup> = {
	argTypes: {
		orientation: { control: "select", options: ["horizontal", "vertical"] },
	},
	component: ButtonGroup,
	tags: ["autodocs"],
	title: "Forms/Button Group",
};

export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {
	render: () => (
		<ButtonGroup>
			<Button aria-label="Bold" variant="outline">
				<TextBIcon />
			</Button>
			<Button aria-label="Italic" variant="outline">
				<TextItalicIcon />
			</Button>
			<Button aria-label="Underline" variant="outline">
				<TextUnderlineIcon />
			</Button>
		</ButtonGroup>
	),
};

export const TextAlignment: Story = {
	render: () => (
		<ButtonGroup>
			<Button aria-label="Align left" variant="outline">
				<TextAlignLeftIcon />
			</Button>
			<Button aria-label="Align center" data-active variant="outline">
				<TextAlignCenterIcon />
			</Button>
			<Button aria-label="Align right" variant="outline">
				<TextAlignRightIcon />
			</Button>
		</ButtonGroup>
	),
};

export const Vertical: Story = {
	render: () => (
		<ButtonGroup orientation="vertical">
			<Button variant="outline">Top</Button>
			<Button variant="outline">Middle</Button>
			<Button variant="outline">Bottom</Button>
		</ButtonGroup>
	),
};

export const WithSeparator: Story = {
	render: () => (
		<ButtonGroup>
			<Button aria-label="Bold" variant="outline">
				<TextBIcon />
			</Button>
			<Button aria-label="Italic" variant="outline">
				<TextItalicIcon />
			</Button>
			<ButtonGroupSeparator />
			<Button aria-label="List" variant="outline">
				<ListIcon />
			</Button>
		</ButtonGroup>
	),
};

export const WithText: Story = {
	render: () => (
		<ButtonGroup>
			<ButtonGroupText>Zone:</ButtonGroupText>
			<Button variant="outline">4A</Button>
			<Button variant="outline">4B</Button>
			<Button variant="outline">5A</Button>
		</ButtonGroup>
	),
};

export const MixedTextIcon: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">All</Button>
			<Button variant="outline">Active</Button>
			<Button variant="outline">Standby</Button>
			<Button variant="outline">Closed</Button>
		</ButtonGroup>
	),
};
