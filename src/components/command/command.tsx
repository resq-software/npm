/**
 * Copyright 2026 ResQ
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

"use client";

import { Command as CommandPrimitive } from "cmdk";
import { CheckIcon, SearchIcon } from "lucide-react";
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

function CommandGroup({
	className,
	...props
}: Readonly<React.ComponentProps<typeof CommandPrimitive.Group>>) {
	return (
		<CommandPrimitive.Group
			className={cn(
				"text-foreground **:**:[&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 **:**:[&_[cmdk-group-heading]]:px-2 **:[&_[cmdk-group-heading]]:py-1.5 **:**:[&_[cmdk-group-heading]]:text-xs **:**:[&_[cmdk-group-heading]]:font-medium",
				className,
			)}
			data-slot="command-group"
			{...props}
		/>
	);
}

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
					<SearchIcon className="size-4 shrink-0 opacity-50" />
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}

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
			<CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
		</CommandPrimitive.Item>
	);
}

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
