// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { ClipboardTextIcon, CopyIcon, EyeIcon, PencilIcon, TrashIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

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
	title: "Overlays/Context Menu",
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
					<ClipboardTextIcon />
					Export report
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive">
					<TrashIcon />
					Delete mission
					<ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	),
};
