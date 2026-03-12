// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Separator } from "./separator";

const meta: Meta<typeof Separator> = {
	argTypes: {
		orientation: { control: "select", options: ["horizontal", "vertical"] },
	},
	component: Separator,
	tags: ["autodocs"],
	title: "Display/Separator",
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
	render: () => (
		<div className="w-64">
			<div className="text-sm font-medium">Mission Alpha</div>
			<Separator className="my-2" />
			<div className="text-sm text-muted-foreground">Zone 4B — Active</div>
		</div>
	),
};

export const Vertical: Story = {
	render: () => (
		<div className="flex h-8 items-center gap-3 text-sm">
			<span className="font-medium">Operations</span>
			<Separator orientation="vertical" />
			<span>Missions</span>
			<Separator orientation="vertical" />
			<span className="text-muted-foreground">Mission Alpha</span>
		</div>
	),
};

export const InLayout: Story = {
	render: () => (
		<div className="w-72 rounded-md border p-4 text-sm">
			<p className="font-semibold">Mission Alpha</p>
			<p className="text-muted-foreground">Search &amp; rescue · Zone 4B</p>
			<Separator className="my-3" />
			<div className="flex justify-between">
				<span className="text-muted-foreground">Responders</span>
				<span>12</span>
			</div>
			<div className="flex justify-between">
				<span className="text-muted-foreground">Drones</span>
				<span>3 active</span>
			</div>
			<Separator className="my-3" />
			<div className="flex justify-between">
				<span className="text-muted-foreground">Status</span>
				<span className="font-medium text-green-600">Active</span>
			</div>
		</div>
	),
};
