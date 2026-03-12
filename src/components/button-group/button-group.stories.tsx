// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon,
	BoldIcon,
	ItalicIcon,
	ListIcon,
	UnderlineIcon,
} from "lucide-react";

import { Button } from "../button";
import {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
} from "./button-group";

const meta: Meta<typeof ButtonGroup> = {
	argTypes: {
		orientation: { control: "select", options: ["horizontal", "vertical"] },
	},
	component: ButtonGroup,
	tags: ["autodocs"],
	title: "Components/ButtonGroup",
};

export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">
				<BoldIcon />
			</Button>
			<Button variant="outline">
				<ItalicIcon />
			</Button>
			<Button variant="outline">
				<UnderlineIcon />
			</Button>
		</ButtonGroup>
	),
};

export const TextAlignment: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">
				<AlignLeftIcon />
			</Button>
			<Button data-active variant="outline">
				<AlignCenterIcon />
			</Button>
			<Button variant="outline">
				<AlignRightIcon />
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
			<Button variant="outline">
				<BoldIcon />
			</Button>
			<Button variant="outline">
				<ItalicIcon />
			</Button>
			<ButtonGroupSeparator />
			<Button variant="outline">
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
