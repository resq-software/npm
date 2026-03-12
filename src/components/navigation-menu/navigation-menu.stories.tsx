// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "./navigation-menu";

const meta: Meta<typeof NavigationMenu> = {
	component: NavigationMenu,
	tags: ["autodocs"],
	title: "Components/NavigationMenu",
};

export default meta;
type Story = StoryObj<typeof NavigationMenu>;

export const Default: Story = {
	render: () => (
		<NavigationMenu>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger>Operations</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-2 p-4 w-64">
							<NavigationMenuLink className="flex flex-col gap-0.5" href="#">
								<span className="font-medium text-sm">Active missions</span>
								<span className="text-xs text-muted-foreground">
									Monitor all live missions
								</span>
							</NavigationMenuLink>
							<NavigationMenuLink className="flex flex-col gap-0.5" href="#">
								<span className="font-medium text-sm">Zone editor</span>
								<span className="text-xs text-muted-foreground">
									Manage search perimeters
								</span>
							</NavigationMenuLink>
							<NavigationMenuLink className="flex flex-col gap-0.5" href="#">
								<span className="font-medium text-sm">Drone fleet</span>
								<span className="text-xs text-muted-foreground">
									Status and assignments
								</span>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuTrigger>Team</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-2 p-4 w-64">
							<NavigationMenuLink className="flex flex-col gap-0.5" href="#">
								<span className="font-medium text-sm">Responders</span>
								<span className="text-xs text-muted-foreground">
									Availability and assignments
								</span>
							</NavigationMenuLink>
							<NavigationMenuLink className="flex flex-col gap-0.5" href="#">
								<span className="font-medium text-sm">Certifications</span>
								<span className="text-xs text-muted-foreground">
									Training records
								</span>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuLink href="#">Reports</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	),
};
