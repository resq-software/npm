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

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils.js";
import { Button } from "../button/button.js";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "../input-group/input-group.js";

const Combobox = ComboboxPrimitive.Root;

function ComboboxChip({
	children,
	className,
	showRemove = true,
	...props
}: ComboboxPrimitive.Chip.Props & {
	showRemove?: boolean;
}) {
	return (
		<ComboboxPrimitive.Chip
			className={cn(
				"bg-muted text-foreground flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap has-data-[slot=combobox-chip-remove]:pr-0 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50",
				className,
			)}
			data-slot="combobox-chip"
			{...props}
		>
			{children}
			{showRemove && (
				<ComboboxPrimitive.ChipRemove
					className="-ml-1 opacity-50 hover:opacity-100"
					data-slot="combobox-chip-remove"
					render={<Button size="icon-xs" variant="ghost" />}
				>
					<XIcon className="pointer-events-none" />
				</ComboboxPrimitive.ChipRemove>
			)}
		</ComboboxPrimitive.Chip>
	);
}

function ComboboxChips({
	className,
	...props
}: ComboboxPrimitive.Chips.Props & React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips>) {
	return (
		<ComboboxPrimitive.Chips
			className={cn(
				"dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive dark:has-aria-invalid:border-destructive/50 flex min-h-8 flex-wrap items-center gap-1 rounded-lg border bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:ring-[3px] has-aria-invalid:ring-[3px] has-data-[slot=combobox-chip]:px-1",
				className,
			)}
			data-slot="combobox-chips"
			{...props}
		/>
	);
}

function ComboboxChipsInput({ className, ...props }: Readonly<ComboboxPrimitive.Input.Props>) {
	return (
		<ComboboxPrimitive.Input
			className={cn("min-w-16 flex-1 outline-none", className)}
			data-slot="combobox-chip-input"
			{...props}
		/>
	);
}

function ComboboxClear({ className, ...props }: Readonly<ComboboxPrimitive.Clear.Props>) {
	return (
		<ComboboxPrimitive.Clear
			className={className}
			data-slot="combobox-clear"
			render={<InputGroupButton size="icon-xs" variant="ghost" />}
			{...props}
		>
			<XIcon className="pointer-events-none" />
		</ComboboxPrimitive.Clear>
	);
}

function ComboboxCollection({ ...props }: Readonly<ComboboxPrimitive.Collection.Props>) {
	return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

function ComboboxContent({
	align = "start",
	alignOffset = 0,
	anchor,
	className,
	side = "bottom",
	sideOffset = 6,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<
		ComboboxPrimitive.Positioner.Props,
		"align" | "alignOffset" | "anchor" | "side" | "sideOffset"
	>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="isolate z-50"
				side={side}
				sideOffset={sideOffset}
			>
				<ComboboxPrimitive.Popup
					className={cn(
						"bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 overflow-hidden rounded-lg shadow-md ring-1 duration-100 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) data-[chips=true]:min-w-(--anchor-width)",
						className,
					)}
					data-chips={!!anchor}
					data-slot="combobox-content"
					{...props}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxEmpty({ className, ...props }: Readonly<ComboboxPrimitive.Empty.Props>) {
	return (
		<ComboboxPrimitive.Empty
			className={cn(
				"text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/combobox-content:flex",
				className,
			)}
			data-slot="combobox-empty"
			{...props}
		/>
	);
}

function ComboboxGroup({ className, ...props }: Readonly<ComboboxPrimitive.Group.Props>) {
	return <ComboboxPrimitive.Group className={className} data-slot="combobox-group" {...props} />;
}

function ComboboxInput({
	children,
	className,
	disabled = false,
	showClear = false,
	showTrigger = true,
	...props
}: ComboboxPrimitive.Input.Props & {
	showClear?: boolean;
	showTrigger?: boolean;
}) {
	return (
		<InputGroup className={cn("w-auto", className)}>
			<ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
			<InputGroupAddon align="inline-end">
				{showTrigger && (
					<InputGroupButton
						asChild
						className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
						data-slot="input-group-button"
						disabled={disabled}
						size="icon-xs"
						variant="ghost"
					>
						<ComboboxTrigger />
					</InputGroupButton>
				)}
				{showClear && <ComboboxClear disabled={disabled} />}
			</InputGroupAddon>
			{children}
		</InputGroup>
	);
}

function ComboboxItem({ children, className, ...props }: Readonly<ComboboxPrimitive.Item.Props>) {
	return (
		<ComboboxPrimitive.Item
			className={cn(
				"data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="combobox-item"
			{...props}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
				}
			>
				<CheckIcon className="pointer-events-none" />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	);
}

function ComboboxLabel({ className, ...props }: Readonly<ComboboxPrimitive.GroupLabel.Props>) {
	return (
		<ComboboxPrimitive.GroupLabel
			className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
			data-slot="combobox-label"
			{...props}
		/>
	);
}

function ComboboxList({ className, ...props }: Readonly<ComboboxPrimitive.List.Props>) {
	return (
		<ComboboxPrimitive.List
			className={cn(
				"no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0 overscroll-contain",
				className,
			)}
			data-slot="combobox-list"
			{...props}
		/>
	);
}

function ComboboxSeparator({ className, ...props }: Readonly<ComboboxPrimitive.Separator.Props>) {
	return (
		<ComboboxPrimitive.Separator
			className={cn("bg-border -mx-1 my-1 h-px", className)}
			data-slot="combobox-separator"
			{...props}
		/>
	);
}

function ComboboxTrigger({
	children,
	className,
	...props
}: Readonly<ComboboxPrimitive.Trigger.Props>) {
	return (
		<ComboboxPrimitive.Trigger
			className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
			data-slot="combobox-trigger"
			{...props}
		>
			{children}
			<ChevronDownIcon className="text-muted-foreground size-4 pointer-events-none" />
		</ComboboxPrimitive.Trigger>
	);
}

function ComboboxValue({ ...props }: Readonly<ComboboxPrimitive.Value.Props>) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function useComboboxAnchor() {
	return React.useRef<HTMLDivElement | null>(null);
}

export {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxValue,
	useComboboxAnchor,
};
