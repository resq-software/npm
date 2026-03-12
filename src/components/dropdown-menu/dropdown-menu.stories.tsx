// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	BellIcon,
	ChevronRightIcon,
	ClipboardListIcon,
	LogOutIcon,
	SettingsIcon,
	UserIcon,
} from "lucide-react";

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
						<SettingsIcon />
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
					<LogOutIcon />
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
					<ClipboardListIcon />
					View report
				</DropdownMenuItem>
				<DropdownMenuItem>
					<UserIcon />
					Reassign commander
				</DropdownMenuItem>
				<DropdownMenuItem>
					<ChevronRightIcon />
					Extend zone
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					<LogOutIcon />
					End mission
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};
