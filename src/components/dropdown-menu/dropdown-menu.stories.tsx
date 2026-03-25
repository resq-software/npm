// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import {
	BellIcon,
	CaretRightIcon,
	ClipboardTextIcon,
	GearIcon,
	SignOutIcon,
	UserIcon,
} from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "./dropdown-menu";

const meta: Meta<typeof DropdownMenu> = {
	component: DropdownMenu,
	tags: ["autodocs"],
	title: "Overlays/Dropdown Menu",
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">My account</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<UserIcon />
						Profile
						<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<GearIcon />
						Settings
						<DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<BellIcon />
						Notifications
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					<SignOutIcon />
					Log out
					<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const MissionActions: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Mission actions</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-52">
				<DropdownMenuLabel>Mission Alpha</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<ClipboardTextIcon />
					View report
				</DropdownMenuItem>
				<DropdownMenuItem>
					<UserIcon />
					Reassign commander
				</DropdownMenuItem>
				<DropdownMenuItem>
					<CaretRightIcon />
					Extend zone
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					<SignOutIcon />
					End mission
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};
