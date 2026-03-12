// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta: Meta<typeof Avatar> = {
	component: Avatar,
	tags: ["autodocs"],
	title: "Display/Avatar",
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
	render: () => (
		<Avatar>
			<AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
			<AvatarFallback>CN</AvatarFallback>
		</Avatar>
	),
};

export const Fallback: Story = {
	render: () => (
		<Avatar>
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	),
};

export const BrokenImage: Story = {
	render: () => (
		<Avatar>
			<AvatarImage alt="User" src="/this-does-not-exist.png" />
			<AvatarFallback>AB</AvatarFallback>
		</Avatar>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Avatar className="size-6">
				<AvatarFallback className="text-[10px]">XS</AvatarFallback>
			</Avatar>
			<Avatar className="size-8">
				<AvatarFallback className="text-xs">SM</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>MD</AvatarFallback>
			</Avatar>
			<Avatar className="size-12">
				<AvatarFallback>LG</AvatarFallback>
			</Avatar>
			<Avatar className="size-16">
				<AvatarFallback>XL</AvatarFallback>
			</Avatar>
		</div>
	),
};

export const Group: Story = {
	render: () => (
		<div className="flex -space-x-2">
			{["JD", "KP", "MR", "SA", "TW"].map((initials) => (
				<Avatar
					className="size-8 border-2 border-background ring-1 ring-border"
					key={initials}
				>
					<AvatarFallback className="text-xs">{initials}</AvatarFallback>
				</Avatar>
			))}
			<Avatar className="size-8 border-2 border-background ring-1 ring-border">
				<AvatarFallback className="text-xs">+8</AvatarFallback>
			</Avatar>
		</div>
	),
};
