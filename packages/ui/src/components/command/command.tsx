/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Command component family — keyboard-first command
 * palette / search picker built on `cmdk`. Use for global ⌘K menus,
 * action launchers, or any quick-find UX.
 *
 * Composition: `Command > CommandInput → CommandList >
 * (CommandEmpty | CommandGroup > CommandItem*)`, with optional
 * `CommandShortcut` (right-aligned ⌘ hint) and `CommandSeparator`.
 * `CommandDialog` wraps `Command` in a `Dialog` for the overlay
 * pattern.
 *
 * @module @resq-systems/ui/components/command/command
 */

"use client";

import { CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Command as CommandPrimitive } from "cmdk";
import type * as React from "react";

import { cn } from "../../lib/utils.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../dialog/dialog.js";
import { InputGroup, InputGroupAddon } from "../input-group/input-group.js";

/** Command-palette root (cmdk) with design-system styling. */
function Command({ className, ...props }: Readonly<React.ComponentProps<typeof CommandPrimitive>>) {
	return (
		<CommandPrimitive
			className={cn(
				"bg-popover text-popover-foreground rounded-lg! p-1 flex size-full flex-col overflow-hidden",
				className,
			)}
			data-slot="command"
			{...props}
		/>
	);
}

/** Command palette hosted inside a modal `Dialog`. */
function CommandDialog({
	children,
	className,
	description = "Search for a command to run...",
	showCloseButton = false,
	title = "Command Palette",
	...props
}: Readonly<
	React.ComponentProps<typeof Dialog> & {
		className?: string;
		description?: string;
		showCloseButton?: boolean;
		title?: string;
	}
>) {
	return (
		<Dialog {...props}>
			<DialogHeader className="sr-only">
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>
			<DialogContent
				className={cn("rounded-lg! top-1/3 translate-y-0 overflow-hidden p-0", className)}
				showCloseButton={showCloseButton}
			>
				{children}
			</DialogContent>
		</Dialog>
	);
}

/** Placeholder shown when no command matches the current query. */
function CommandEmpty({
	className,
	...props
}: Readonly<React.ComponentProps<typeof CommandPrimitive.Empty>>) {
	return (
		<CommandPrimitive.Empty
			className={cn("py-6 text-center text-sm", className)}
			data-slot="command-empty"
			{...props}
		/>
	);
}

/** Titled group of related command items. */
function CommandGroup({
	className,
	...props
}: Readonly<React.ComponentProps<typeof CommandPrimitive.Group>>) {
	return (
		<CommandPrimitive.Group
			className={cn(
				"text-foreground **:**:**:[[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 **:**:**:[[cmdk-group-heading]]:px-2 **:**:[[cmdk-group-heading]]:py-1.5 **:**:**:[[cmdk-group-heading]]:text-xs **:**:**:[[cmdk-group-heading]]:font-medium",
				className,
			)}
			data-slot="command-group"
			{...props}
		/>
	);
}

/** Search field that filters the command list as the user types. */
function CommandInput({
	className,
	...props
}: Readonly<React.ComponentProps<typeof CommandPrimitive.Input>>) {
	return (
		<div className="p-1 pb-0" data-slot="command-input-wrapper">
			<InputGroup className="bg-input/30 border-input/30 h-8! rounded-lg! shadow-none! *:data-[slot=input-group-addon]:pl-2!">
				<CommandPrimitive.Input
					className={cn(
						"w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
					data-slot="command-input"
					{...props}
				/>
				<InputGroupAddon>
					<MagnifyingGlassIcon className="size-4 shrink-0 opacity-50" weight="light" />
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}

/** A single selectable command row. */
function CommandItem({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof CommandPrimitive.Item>>) {
	return (
		<CommandPrimitive.Item
			className={cn(
				"data-selected:bg-muted data-selected:text-foreground data-selected:*:[svg]:text-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg:not([class*='size-'])]:size-4 in-data-[slot=dialog-content]:rounded-lg! group/command-item data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="command-item"
			{...props}
		>
			{children}
			<CheckIcon
				className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100"
				weight="light"
			/>
		</CommandPrimitive.Item>
	);
}

/** Scrollable container for the filtered command results. */
function CommandList({
	className,
	...props
}: Readonly<React.ComponentProps<typeof CommandPrimitive.List>>) {
	return (
		<CommandPrimitive.List
			className={cn(
				"no-scrollbar max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto",
				className,
			)}
			data-slot="command-list"
			{...props}
		/>
	);
}

/** Divider between command groups. */
function CommandSeparator({
	className,
	...props
}: Readonly<React.ComponentProps<typeof CommandPrimitive.Separator>>) {
	return (
		<CommandPrimitive.Separator
			className={cn("bg-border -mx-1 h-px", className)}
			data-slot="command-separator"
			{...props}
		/>
	);
}

/** Right-aligned keyboard-shortcut hint for a command item. */
function CommandShortcut({ className, ...props }: Readonly<React.ComponentProps<"span">>) {
	return (
		<span
			className={cn(
				"text-muted-foreground group-data-selected/command-item:text-foreground ml-auto text-xs tracking-widest",
				className,
			)}
			data-slot="command-shortcut"
			{...props}
		/>
	);
}

export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
};
