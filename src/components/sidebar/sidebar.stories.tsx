// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	ActivityIcon,
	DrillIcon,
	FileTextIcon,
	MapPinIcon,
	RadioIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react";
import * as React from "react";

import { Badge } from "../badge";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
} from "./sidebar";

const meta: Meta<typeof Sidebar> = {
	component: Sidebar,
	tags: ["autodocs"],
	title: "Components/Sidebar",
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
	render: () => (
		<SidebarProvider
			style={{ "--sidebar-width": "220px" } as React.CSSProperties}
		>
			<Sidebar>
				<SidebarHeader>
					<div className="flex items-center gap-2 px-2 py-1">
						<RadioIcon className="size-4 text-primary" />
						<span className="text-sm font-semibold">ResQ Ops</span>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Operations</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton isActive>
										<ActivityIcon />
										Dashboard
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<MapPinIcon />
										Missions
									</SidebarMenuButton>
									<SidebarMenuBadge>4</SidebarMenuBadge>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<DrillIcon />
										Drone fleet
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarSeparator />
					<SidebarGroup>
						<SidebarGroupLabel>Team</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<UsersIcon />
										Responders
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<FileTextIcon />
										Reports
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton>
								<SettingsIcon />
								Settings
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<main className="flex flex-1 flex-col gap-4 p-4 min-h-48">
				<div className="flex items-center gap-2">
					<SidebarTrigger />
					<span className="text-sm text-muted-foreground">Dashboard</span>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="default">
						<ActivityIcon className="size-3" />4 active missions
					</Badge>
					<Badge variant="secondary">
						<DrillIcon className="size-3" />3 drones airborne
					</Badge>
				</div>
			</main>
		</SidebarProvider>
	),
};
