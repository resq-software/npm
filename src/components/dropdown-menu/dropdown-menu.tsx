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

import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function DropdownMenu({
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.Root>>) {
	return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuCheckboxItem({
	checked,
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>>) {
	return (
		<DropdownMenuPrimitive.CheckboxItem
			checked={checked}
			className={cn(
				"focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="dropdown-menu-checkbox-item"
			{...props}
		>
			<span
				className="pointer-events-none absolute right-2 flex items-center justify-center"
				data-slot="dropdown-menu-checkbox-item-indicator"
			>
				<DropdownMenuPrimitive.ItemIndicator>
					<CheckIcon weight="light" />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.CheckboxItem>
	);
}

function DropdownMenuContent({
	align = "start",
	className,
	sideOffset = 4,
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.Content>>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				align={align}
				className={cn(
					"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto data-[state=closed]:overflow-hidden",
					className,
				)}
				data-slot="dropdown-menu-content"
				sideOffset={sideOffset}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	);
}

function DropdownMenuGroup({
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.Group>>) {
	return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	...props
}: Readonly<
	React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean;
		variant?: "default" | "destructive";
	}
>) {
	return (
		<DropdownMenuPrimitive.Item
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive-text data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive-text data-[variant=destructive]:*:[svg]:text-destructive-text not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-inset={inset}
			data-slot="dropdown-menu-item"
			data-variant={variant}
			{...props}
		/>
	);
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: Readonly<
	React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean;
	}
>) {
	return (
		<DropdownMenuPrimitive.Label
			className={cn(
				"text-muted-foreground px-1.5 py-1 text-xs font-medium data-inset:pl-8",
				className,
			)}
			data-inset={inset}
			data-slot="dropdown-menu-label"
			{...props}
		/>
	);
}

function DropdownMenuPortal({
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.Portal>>) {
	return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuRadioGroup({
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>>) {
	return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>>) {
	return (
		<DropdownMenuPrimitive.RadioItem
			className={cn(
				"focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="dropdown-menu-radio-item"
			{...props}
		>
			<span
				className="pointer-events-none absolute right-2 flex items-center justify-center"
				data-slot="dropdown-menu-radio-item-indicator"
			>
				<DropdownMenuPrimitive.ItemIndicator>
					<CheckIcon weight="light" />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.RadioItem>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.Separator>>) {
	return (
		<DropdownMenuPrimitive.Separator
			className={cn("bg-border -mx-1 my-1 h-px", className)}
			data-slot="dropdown-menu-separator"
			{...props}
		/>
	);
}

function DropdownMenuShortcut({ className, ...props }: Readonly<React.ComponentProps<"span">>) {
	return (
		<span
			className={cn(
				"text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
				className,
			)}
			data-slot="dropdown-menu-shortcut"
			{...props}
		/>
	);
}

function DropdownMenuSub({
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.Sub>>) {
	return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubContent({
	className,
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>>) {
	return (
		<DropdownMenuPrimitive.SubContent
			className={cn(
				"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-24 rounded-lg p-1 shadow-lg ring-1 duration-100 z-50 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden",
				className,
			)}
			data-slot="dropdown-menu-sub-content"
			{...props}
		/>
	);
}

function DropdownMenuSubTrigger({
	children,
	className,
	inset,
	...props
}: Readonly<
	React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean;
	}
>) {
	return (
		<DropdownMenuPrimitive.SubTrigger
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-inset={inset}
			data-slot="dropdown-menu-sub-trigger"
			{...props}
		>
			{children}
			<CaretRightIcon className="ml-auto" weight="light" />
		</DropdownMenuPrimitive.SubTrigger>
	);
}

function DropdownMenuTrigger({
	...props
}: Readonly<React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>>) {
	return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
