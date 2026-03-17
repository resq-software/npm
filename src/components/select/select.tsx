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

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function Select({ ...props }: Readonly<React.ComponentProps<typeof SelectPrimitive.Root>>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectContent({
	align = "center",
	children,
	className,
	position = "item-aligned",
	...props
}: Readonly<React.ComponentProps<typeof SelectPrimitive.Content>>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				align={align}
				className={cn(
					"bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 border border-border min-w-40 rounded-lg shadow-md duration-100 relative z-50 max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto data-[align-trigger=true]:animate-none",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				data-align-trigger={position === "item-aligned"}
				data-slot="select-content"
				position={position}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						"data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
						position === "popper" && "",
					)}
					data-position={position}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectGroup({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SelectPrimitive.Group>>) {
	return (
		<SelectPrimitive.Group
			className={cn("scroll-my-1 p-1", className)}
			data-slot="select-group"
			{...props}
		/>
	);
}

function SelectItem({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof SelectPrimitive.Item>>) {
	return (
		<SelectPrimitive.Item
			className={cn(
				"focus:bg-card focus:text-foreground gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="select-item"
			{...props}
		>
			<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="pointer-events-none" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectLabel({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SelectPrimitive.Label>>) {
	return (
		<SelectPrimitive.Label
			className={cn(
				"text-hint px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em]",
				className,
			)}
			data-slot="select-label"
			{...props}
		/>
	);
}

function SelectScrollDownButton({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>>) {
	return (
		<SelectPrimitive.ScrollDownButton
			className={cn(
				"bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			data-slot="select-scroll-down-button"
			{...props}
		>
			<ChevronDownIcon />
		</SelectPrimitive.ScrollDownButton>
	);
}

function SelectScrollUpButton({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>>) {
	return (
		<SelectPrimitive.ScrollUpButton
			className={cn(
				"bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			data-slot="select-scroll-up-button"
			{...props}
		>
			<ChevronUpIcon />
		</SelectPrimitive.ScrollUpButton>
	);
}

function SelectSeparator({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SelectPrimitive.Separator>>) {
	return (
		<SelectPrimitive.Separator
			className={cn("bg-border -mx-1 my-1 h-px pointer-events-none", className)}
			data-slot="select-separator"
			{...props}
		/>
	);
}

function SelectTrigger({
	children,
	className,
	size = "default",
	...props
}: Readonly<
	React.ComponentProps<typeof SelectPrimitive.Trigger> & {
		size?: "default" | "sm";
	}
>) {
	return (
		<SelectPrimitive.Trigger
			className={cn(
				"border-border data-placeholder:text-muted-foreground bg-surface hover:border-border-hover focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive gap-1.5 rounded-lg border py-2 pr-2 pl-3 text-sm text-foreground transition-colors select-none focus-visible:ring-[3px] aria-invalid:ring-[3px] data-[size=default]:h-9 data-[size=sm]:h-7 data-[size=sm]:rounded-lg *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4 flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-size={size}
			data-slot="select-trigger"
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="text-hint size-4 pointer-events-none" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectValue({ ...props }: Readonly<React.ComponentProps<typeof SelectPrimitive.Value>>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
