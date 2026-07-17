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
 * @fileoverview Menubar component family — desktop-style horizontal
 * menu bar (think macOS app menus) built on
 * Radix UI's `Menubar` primitive. Each top-level `MenubarMenu` exposes
 * its own dropdown content with the same item / submenu / shortcut
 * vocabulary as `DropdownMenu`.
 *
 * Composition: `Menubar > MenubarMenu > MenubarTrigger +
 * MenubarContent > (MenubarItem | MenubarCheckboxItem |
 * MenubarRadioGroup > MenubarRadioItem | MenubarSub …)`.
 *
 * @module @resq-systems/ui/components/menubar/menubar
 */

"use client";

import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import { Menubar as MenubarPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

/** Horizontal application menu bar containing `MenubarMenu`s. */
function Menubar({
	className,
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.Root>>) {
	return (
		<MenubarPrimitive.Root
			className={cn(
				"bg-background h-8 gap-0.5 rounded-lg border p-[3px] flex items-center",
				className,
			)}
			data-slot="menubar"
			{...props}
		/>
	);
}

/** Menu row with a toggle checkmark bound to its `checked` state. */
function MenubarCheckboxItem({
	checked,
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>>) {
	return (
		<MenubarPrimitive.CheckboxItem
			checked={checked}
			className={cn(
				"focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm data-disabled:opacity-50 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="menubar-checkbox-item"
			{...props}
		>
			<span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
				<MenubarPrimitive.ItemIndicator>
					<CheckIcon weight="light" />
				</MenubarPrimitive.ItemIndicator>
			</span>
			{children}
		</MenubarPrimitive.CheckboxItem>
	);
}

/** Floating menu surface for a `MenubarMenu`, portalled and positioned. */
function MenubarContent({
	align = "start",
	alignOffset = -4,
	className,
	sideOffset = 8,
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.Content>>) {
	return (
		<MenubarPortal>
			<MenubarPrimitive.Content
				align={align}
				alignOffset={alignOffset}
				className={cn(
					"bg-popover text-popover-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 origin-(--radix-menubar-content-transform-origin) overflow-hidden",
					className,
				)}
				data-slot="menubar-content"
				sideOffset={sideOffset}
				{...props}
			/>
		</MenubarPortal>
	);
}

/** Semantic grouping of related menu items. */
function MenubarGroup({ ...props }: Readonly<React.ComponentProps<typeof MenubarPrimitive.Group>>) {
	return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}

/** A selectable menu row; `variant` and `inset` adjust its styling. */
function MenubarItem({
	className,
	inset,
	variant = "default",
	...props
}: Readonly<
	React.ComponentProps<typeof MenubarPrimitive.Item> & {
		inset?: boolean;
		variant?: "default" | "destructive";
	}
>) {
	return (
		<MenubarPrimitive.Item
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive-text data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive-text data-[variant=destructive]:*:[svg]:text-destructive-text! not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-disabled:opacity-50 data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 group/menubar-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-inset={inset}
			data-slot="menubar-item"
			data-variant={variant}
			{...props}
		/>
	);
}

/** Non-interactive section label within a menu. */
function MenubarLabel({
	className,
	inset,
	...props
}: Readonly<
	React.ComponentProps<typeof MenubarPrimitive.Label> & {
		inset?: boolean;
	}
>) {
	return (
		<MenubarPrimitive.Label
			className={cn("px-1.5 py-1 text-sm font-medium data-inset:pl-8", className)}
			data-inset={inset}
			data-slot="menubar-label"
			{...props}
		/>
	);
}

/** A single top-level menu within the `Menubar`. */
function MenubarMenu({ ...props }: Readonly<React.ComponentProps<typeof MenubarPrimitive.Menu>>) {
	return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

/** Portals the menu subtree to the document body. */
function MenubarPortal({
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.Portal>>) {
	return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />;
}

/** Groups mutually-exclusive `MenubarRadioItem`s. */
function MenubarRadioGroup({
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.RadioGroup>>) {
	return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

/** Single-select menu row rendering a radio indicator. */
function MenubarRadioItem({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.RadioItem>>) {
	return (
		<MenubarPrimitive.RadioItem
			className={cn(
				"focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="menubar-radio-item"
			{...props}
		>
			<span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
				<MenubarPrimitive.ItemIndicator>
					<CheckIcon weight="light" />
				</MenubarPrimitive.ItemIndicator>
			</span>
			{children}
		</MenubarPrimitive.RadioItem>
	);
}

/** Divider between menu sections. */
function MenubarSeparator({
	className,
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.Separator>>) {
	return (
		<MenubarPrimitive.Separator
			className={cn("bg-border -mx-1 my-1 h-px", className)}
			data-slot="menubar-separator"
			{...props}
		/>
	);
}

/** Right-aligned keyboard-shortcut hint for a menu item. */
function MenubarShortcut({ className, ...props }: Readonly<React.ComponentProps<"span">>) {
	return (
		<span
			className={cn(
				"text-muted-foreground group-focus/menubar-item:text-accent-foreground text-xs tracking-widest ml-auto",
				className,
			)}
			data-slot="menubar-shortcut"
			{...props}
		/>
	);
}

/** Root of a nested submenu. */
function MenubarSub({ ...props }: Readonly<React.ComponentProps<typeof MenubarPrimitive.Sub>>) {
	return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

/** Floating panel for a submenu's items. */
function MenubarSubContent({
	className,
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.SubContent>>) {
	return (
		<MenubarPrimitive.SubContent
			className={cn(
				"bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-32 rounded-lg p-1 shadow-lg ring-1 duration-100 z-50 origin-(--radix-menubar-content-transform-origin) overflow-hidden",
				className,
			)}
			data-slot="menubar-sub-content"
			{...props}
		/>
	);
}

/** Menu row that opens its submenu on hover or focus. */
function MenubarSubTrigger({
	children,
	className,
	inset,
	...props
}: Readonly<
	React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
		inset?: boolean;
	}
>) {
	return (
		<MenubarPrimitive.SubTrigger
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-none select-none",
				className,
			)}
			data-inset={inset}
			data-slot="menubar-sub-trigger"
			{...props}
		>
			{children}
			<CaretRightIcon className="ml-auto size-4" weight="light" />
		</MenubarPrimitive.SubTrigger>
	);
}

/** Top-bar button that opens its `MenubarMenu`. */
function MenubarTrigger({
	className,
	...props
}: Readonly<React.ComponentProps<typeof MenubarPrimitive.Trigger>>) {
	return (
		<MenubarPrimitive.Trigger
			className={cn(
				"hover:bg-muted aria-expanded:bg-muted rounded-sm px-1.5 py-0.5 text-sm font-medium flex items-center outline-hidden select-none",
				className,
			)}
			data-slot="menubar-trigger"
			{...props}
		/>
	);
}

export {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarGroup,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarPortal,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
};
