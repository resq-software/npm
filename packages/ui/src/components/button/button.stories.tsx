// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { DownloadIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";

import { Spinner } from "../spinner";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
	argTypes: {
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon", "icon-sm"],
		},
		variant: {
			control: "select",
			options: ["default", "destructive", "outline", "secondary", "urgent", "ghost", "link"],
		},
	},
	component: Button,
	tags: ["autodocs"],
	title: "Forms/Button",
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
	args: { children: "Button" },
};

export const Destructive: Story = {
	args: { children: "Delete mission", variant: "destructive" },
};

export const Outline: Story = {
	args: { children: "Cancel", variant: "outline" },
};

export const Secondary: Story = {
	args: { children: "System action", variant: "secondary" },
};

export const Urgent: Story = {
	args: { children: "Dispatch now", variant: "urgent" },
};

export const Ghost: Story = {
	args: { children: "View details", variant: "ghost" },
};

export const Link: Story = {
	args: { children: "Learn more", variant: "link" },
};

export const Disabled: Story = {
	args: { children: "Unavailable", disabled: true },
};

export const Clickable: Story = {
	play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole("button");
		await userEvent.click(button);
		await expect(button).toBeInTheDocument();
	},
};

export const Loading: Story = {
	render: () => (
		<Button disabled>
			<Spinner />
			Saving…
		</Button>
	),
};

export const WithLeadingIcon: Story = {
	render: () => (
		<Button>
			<PlusIcon />
			New mission
		</Button>
	),
};

export const WithTrailingIcon: Story = {
	render: () => (
		<Button variant="outline">
			Download report
			<DownloadIcon />
		</Button>
	),
};

export const IconOnly: Story = {
	render: () => (
		<Button aria-label="Delete" size="icon" variant="outline">
			<TrashIcon />
		</Button>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Button variant="default">Default</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="urgent">Urgent</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-2 flex-wrap">
			<Button size="lg">Large</Button>
			<Button size="default">Default</Button>
			<Button size="sm">Small</Button>
			<Button aria-label="Download" size="icon">
				<DownloadIcon />
			</Button>
			<Button aria-label="Delete" size="icon-sm">
				<TrashIcon />
			</Button>
		</div>
	),
};
