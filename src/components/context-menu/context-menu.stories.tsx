// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	ClipboardListIcon,
	CopyIcon,
	EyeIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "./context-menu";

const meta: Meta<typeof ContextMenu> = {
	component: ContextMenu,
	tags: ["autodocs"],
	title: "Components/ContextMenu",
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

export const Default: Story = {
	render: () => (
		<ContextMenu>
			<ContextMenuTrigger className="flex h-32 w-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground select-none">
				Right-click anywhere in this area
			</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				<ContextMenuLabel>Mission Alpha</ContextMenuLabel>
				<ContextMenuSeparator />
				<ContextMenuItem>
					<EyeIcon />
					View details
					<ContextMenuShortcut>⌘⏎</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem>
					<PencilIcon />
					Edit mission
					<ContextMenuShortcut>⌘E</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem>
					<CopyIcon />
					Duplicate
				</ContextMenuItem>
				<ContextMenuItem>
					<ClipboardListIcon />
					Export report
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive">
					<Trash2Icon />
					Delete mission
					<ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	),
};
