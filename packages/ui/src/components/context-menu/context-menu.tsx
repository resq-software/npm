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
 * @fileoverview ContextMenu component family — right-click menu
 * built on Radix UI's `ContextMenu` primitive. Same internal structure
 * as `DropdownMenu` (items, sub-menus, checkbox/radio items,
 * shortcut hints) but triggered by a context-menu event on the
 * wrapping `ContextMenuTrigger`.
 *
 * Composition: `ContextMenu > ContextMenuTrigger + ContextMenuContent`,
 * with `ContextMenuItem`, `ContextMenuCheckboxItem`,
 * `ContextMenuRadioGroup` + `ContextMenuRadioItem`,
 * `ContextMenuSub`, and label/separator helpers.
 *
 * @module @resq-systems/ui/components/context-menu/context-menu
 */

"use client";

import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

/** Root of the right-click context menu; owns open state. */
function ContextMenu({
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.Root>>) {
	return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

/** Menu row with a toggle checkmark bound to its `checked` state. */
function ContextMenuCheckboxItem({
	checked,
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>>) {
	return (
		<ContextMenuPrimitive.CheckboxItem
			checked={checked}
			className={cn(
				"focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="context-menu-checkbox-item"
			{...props}
		>
			<span className="absolute right-2 pointer-events-none">
				<ContextMenuPrimitive.ItemIndicator>
					<CheckIcon weight="light" />
				</ContextMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</ContextMenuPrimitive.CheckboxItem>
	);
}

/** Floating menu surface, portalled and positioned at the pointer. */
function ContextMenuContent({
	className,
	...props
}: Readonly<
	React.ComponentProps<typeof ContextMenuPrimitive.Content> & {
		side?: "bottom" | "left" | "right" | "top";
	}
>) {
	return (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.Content
				className={cn(
					"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
					className,
				)}
				data-slot="context-menu-content"
				{...props}
			/>
		</ContextMenuPrimitive.Portal>
	);
}

/** Semantic grouping of related menu items. */
function ContextMenuGroup({
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.Group>>) {
	return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

/** A selectable menu row; `variant` and `inset` adjust its styling. */
function ContextMenuItem({
	className,
	inset,
	variant = "default",
	...props
}: Readonly<
	React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
		inset?: boolean;
		variant?: "default" | "destructive";
	}
>) {
	return (
		<ContextMenuPrimitive.Item
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive-text data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive-text data-[variant=destructive]:*:[svg]:text-destructive-text focus:*:[svg]:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/context-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-inset={inset}
			data-slot="context-menu-item"
			data-variant={variant}
			{...props}
		/>
	);
}

/** Non-interactive section label within the menu. */
function ContextMenuLabel({
	className,
	inset,
	...props
}: Readonly<
	React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
		inset?: boolean;
	}
>) {
	return (
		<ContextMenuPrimitive.Label
			className={cn(
				"text-muted-foreground px-1.5 py-1 text-xs font-medium data-inset:pl-8",
				className,
			)}
			data-inset={inset}
			data-slot="context-menu-label"
			{...props}
		/>
	);
}

/** Portals the menu subtree to the document body. */
function ContextMenuPortal({
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.Portal>>) {
	return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}

/** Groups mutually-exclusive `ContextMenuRadioItem`s. */
function ContextMenuRadioGroup({
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>>) {
	return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

/** Single-select menu row rendering a radio indicator. */
function ContextMenuRadioItem({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>>) {
	return (
		<ContextMenuPrimitive.RadioItem
			className={cn(
				"focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="context-menu-radio-item"
			{...props}
		>
			<span className="absolute right-2 pointer-events-none">
				<ContextMenuPrimitive.ItemIndicator>
					<CheckIcon weight="light" />
				</ContextMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</ContextMenuPrimitive.RadioItem>
	);
}

/** Divider between menu sections. */
function ContextMenuSeparator({
	className,
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.Separator>>) {
	return (
		<ContextMenuPrimitive.Separator
			className={cn("bg-border -mx-1 my-1 h-px", className)}
			data-slot="context-menu-separator"
			{...props}
		/>
	);
}

/** Right-aligned keyboard-shortcut hint for a menu item. */
function ContextMenuShortcut({ className, ...props }: Readonly<React.ComponentProps<"span">>) {
	return (
		<span
			className={cn(
				"text-muted-foreground group-focus/context-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
				className,
			)}
			data-slot="context-menu-shortcut"
			{...props}
		/>
	);
}

/** Root of a nested submenu. */
function ContextMenuSub({
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.Sub>>) {
	return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

/** Floating panel for a submenu's items. */
function ContextMenuSubContent({
	className,
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.SubContent>>) {
	return (
		<ContextMenuPrimitive.SubContent
			className={cn(
				"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-popover text-popover-foreground min-w-32 rounded-lg border p-1 shadow-lg duration-100 z-50 origin-(--radix-context-menu-content-transform-origin) overflow-hidden",
				className,
			)}
			data-slot="context-menu-sub-content"
			{...props}
		/>
	);
}

/** Menu row that opens its submenu on hover or focus. */
function ContextMenuSubTrigger({
	children,
	className,
	inset,
	...props
}: Readonly<
	React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
		inset?: boolean;
	}
>) {
	return (
		<ContextMenuPrimitive.SubTrigger
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-inset={inset}
			data-slot="context-menu-sub-trigger"
			{...props}
		>
			{children}
			<CaretRightIcon className="ml-auto" weight="light" />
		</ContextMenuPrimitive.SubTrigger>
	);
}

/** Element whose right-click (context) event opens the menu. */
function ContextMenuTrigger({
	className,
	...props
}: Readonly<React.ComponentProps<typeof ContextMenuPrimitive.Trigger>>) {
	return (
		<ContextMenuPrimitive.Trigger
			className={cn("select-none", className)}
			data-slot="context-menu-trigger"
			{...props}
		/>
	);
}

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuPortal,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
};
