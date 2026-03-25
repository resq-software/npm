// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { CheckCircleIcon, ClockIcon, RadioIcon, WarningIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
		},
	},
	component: Badge,
	tags: ["autodocs"],
	title: "Display/Badge",
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
	args: { children: "Live", variant: "default" },
};

export const Secondary: Story = {
	args: { children: "Syncing", variant: "secondary" },
};

export const Destructive: Story = {
	args: { children: "Critical", variant: "destructive" },
};

export const Outline: Story = {
	args: { children: "Standby", variant: "outline" },
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="ghost">Ghost</Badge>
			<Badge variant="link">Link</Badge>
		</div>
	),
};

export const StatusBadges: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">
				<RadioIcon className="size-3" />
				Active
			</Badge>
			<Badge variant="secondary">
				<ClockIcon className="size-3" />
				Standby
			</Badge>
			<Badge variant="outline">
				<CheckCircleIcon className="size-3" />
				Resolved
			</Badge>
			<Badge variant="destructive">
				<WarningIcon className="size-3" />
				Critical
			</Badge>
		</div>
	),
};
