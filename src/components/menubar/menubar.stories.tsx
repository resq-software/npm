// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from "./menubar";

const meta: Meta<typeof Menubar> = {
	component: Menubar,
	tags: ["autodocs"],
	title: "Components/Menubar",
};

export default meta;
type Story = StoryObj<typeof Menubar>;

export const Default: Story = {
	render: () => (
		<Menubar>
			<MenubarMenu>
				<MenubarTrigger>Missions</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>
						New mission <MenubarShortcut>⌘N</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>Import from CSV</MenubarItem>
					<MenubarSeparator />
					<MenubarSub>
						<MenubarSubTrigger>Export</MenubarSubTrigger>
						<MenubarSubContent>
							<MenubarItem>Export as PDF</MenubarItem>
							<MenubarItem>Export as CSV</MenubarItem>
							<MenubarItem>Export as GeoJSON</MenubarItem>
						</MenubarSubContent>
					</MenubarSub>
					<MenubarSeparator />
					<MenubarItem>Archive mission</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu>
				<MenubarTrigger>View</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>
						Map view <MenubarShortcut>⌘1</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>
						List view <MenubarShortcut>⌘2</MenubarShortcut>
					</MenubarItem>
					<MenubarSeparator />
					<MenubarItem>
						Refresh <MenubarShortcut>⌘R</MenubarShortcut>
					</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu>
				<MenubarTrigger>Help</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>Documentation</MenubarItem>
					<MenubarItem>Keyboard shortcuts</MenubarItem>
					<MenubarSeparator />
					<MenubarItem>Report an issue</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	),
};
