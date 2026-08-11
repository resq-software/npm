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
 * @fileoverview Item component family — generic list-row primitive
 * with media / content / actions slots and group wrappers. Use as
 * the building block for nav lists, contact lists, settings rows,
 * and any vertically-stacked, line-per-record UI.
 *
 * Composition:
 * - `ItemGroup` — wraps a vertical list of items and supplies the
 *   `role="list"` that makes its rows' `role="listitem"` valid.
 * - `Item` — single row; supports `variant` (default / outline /
 *   muted) and `size` (default / sm).
 * - `ItemMedia` — leading slot for an avatar, icon, or thumbnail
 *   with its own variant set.
 * - `ItemContent` — main text column.
 * - `ItemTitle`, `ItemDescription` — text helpers within content.
 * - `ItemActions` — trailing slot for buttons / chevrons.
 * - `ItemHeader`, `ItemFooter`, `ItemSeparator` — supporting
 *   helpers.
 *
 * `Item` supports `asChild` so it can render as a routing link via
 * Radix Slot.
 *
 * Semantics: `Item` is this family's `<li>` — it always carries
 * `role="listitem"`, so it must render inside an `ItemGroup` (or
 * another `role="list"` container), including when there is only one
 * row; a group of one is correct, as a one-item `<ul>` is. The two
 * roles are a matched pair and neither survives alone: an ungrouped
 * `Item` fails `aria-required-parent` and may be dropped from the
 * accessibility tree, while a group whose children drop the role
 * fails `aria-required-children`. For a standalone surface that is
 * not a record in a collection, reach for `Card` instead.
 *
 * @module @resq-systems/ui/components/item/item
 */

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";
import { Separator } from "../separator/separator.js";

/** Vertical list container for related `Item`s. */
function ItemGroup({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2 group/item-group flex w-full flex-col",
				className,
			)}
			data-slot="item-group"
			role="list"
			{...props}
		/>
	);
}

/** Divider drawn between items in an `ItemGroup`. */
function ItemSeparator({ className, ...props }: Readonly<React.ComponentProps<typeof Separator>>) {
	return (
		<Separator
			className={cn("my-2", className)}
			data-slot="item-separator"
			orientation="horizontal"
			{...props}
		/>
	);
}

const itemVariants = cva(
	"[a]:hover:bg-card rounded-lg border text-sm w-full group/item focus-visible:border-ring focus-visible:ring-ring/50 flex items-center flex-wrap outline-none transition-colors duration-100 focus-visible:ring-[3px] [a]:transition-colors",
	{
		defaultVariants: {
			size: "default",
			variant: "default",
		},
		variants: {
			size: {
				default: "gap-2.5 px-3 py-2.5",
				sm: "gap-2.5 px-3 py-2.5",
				xs: "gap-2 px-2.5 py-2 [[data-slot=dropdown-menu-content]_&]:p-0",
			},
			variant: {
				default: "border-border bg-surface",
				muted: "border-border bg-card",
				outline: "border-border bg-transparent",
			},
		},
	},
);

/** A single row combining media, content, and actions; `variant` sets its emphasis. */
function Item({
	asChild = false,
	className,
	size = "default",
	variant = "default",
	...props
}: Readonly<
	React.ComponentProps<"div"> & VariantProps<typeof itemVariants> & { asChild?: boolean }
>) {
	const Comp = asChild ? Slot.Root : "div";
	return (
		<Comp
			className={cn(itemVariants({ className, size, variant }))}
			data-size={size}
			data-slot="item"
			data-variant={variant}
			role="listitem"
			{...props}
		/>
	);
}

const itemMediaVariants = cva(
	"gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "[&_svg:not([class*='size-'])]:size-4",
				image:
					"size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
			},
		},
	},
);

/** Trailing controls slot (e.g. buttons or a menu) for an `Item`. */
function ItemActions({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div className={cn("gap-2 flex items-center", className)} data-slot="item-actions" {...props} />
	);
}

/** Main text column holding the item's title and description. */
function ItemContent({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"gap-1 group-data-[size=xs]/item:gap-0 flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none",
				className,
			)}
			data-slot="item-content"
			{...props}
		/>
	);
}

/** Muted secondary line beneath the `ItemTitle`. */
function ItemDescription({ className, ...props }: Readonly<React.ComponentProps<"p">>) {
	return (
		<p
			className={cn(
				"text-muted-foreground text-left text-sm leading-relaxed group-data-[size=xs]/item:text-xs [&>a:hover]:text-primary line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4",
				className,
			)}
			data-slot="item-description"
			{...props}
		/>
	);
}

/** Bottom row of an `Item` for supplementary metadata or actions. */
function ItemFooter({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn("gap-2 flex basis-full items-center justify-between", className)}
			data-slot="item-footer"
			{...props}
		/>
	);
}

/** Top row of an `Item`, above the main content. */
function ItemHeader({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn("gap-2 flex basis-full items-center justify-between", className)}
			data-slot="item-header"
			{...props}
		/>
	);
}

/** Leading icon/avatar/image slot; the `variant` sets its framing. */
function ItemMedia({
	className,
	variant = "default",
	...props
}: Readonly<React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>>) {
	return (
		<div
			className={cn(itemMediaVariants({ className, variant }))}
			data-slot="item-media"
			data-variant={variant}
			{...props}
		/>
	);
}

/** Primary label line of an `Item`. */
function ItemTitle({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"text-foreground gap-2 text-sm leading-snug font-medium underline-offset-4 line-clamp-1 flex w-fit items-center",
				className,
			)}
			data-slot="item-title"
			{...props}
		/>
	);
}

export {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
};
