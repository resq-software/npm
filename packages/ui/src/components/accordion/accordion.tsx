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
 * @fileoverview Accordion component family — vertically-stacked
 * disclosure surfaces built on Radix UI's `Accordion` primitive. Each
 * `AccordionItem` toggles a single panel; `type="multiple"` on
 * the root permits multiple open at once.
 *
 * Composition: `Accordion > AccordionItem > (AccordionTrigger + AccordionContent)`.
 *
 * Accessibility: keyboard-navigable (arrow keys, Home, End), full
 * ARIA semantics from Radix. Open/close animations are wired via
 * `data-open:animate-accordion-down` / `data-closed:animate-accordion-up`.
 *
 * @module @resq-systems/ui/components/accordion/accordion
 */

"use client";

import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

/**
 * Root of the accordion family — owns open/close state and forwards Radix
 * props. Set `type="multiple"` to allow several panels open at once.
 *
 * @see {@link AccordionItem}
 */
function Accordion({
	className,
	...props
}: Readonly<React.ComponentProps<typeof AccordionPrimitive.Root>>) {
	return (
		<AccordionPrimitive.Root
			className={cn("flex w-full flex-col", className)}
			data-slot="accordion"
			{...props}
		/>
	);
}

/**
 * Collapsible panel body revealed when its `AccordionItem` is open; animates
 * open/closed via the `data-open` / `data-closed` height transitions.
 */
function AccordionContent({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof AccordionPrimitive.Content>>) {
	return (
		<AccordionPrimitive.Content
			className="data-open:animate-accordion-down data-closed:animate-accordion-up text-sm overflow-hidden"
			data-slot="accordion-content"
			{...props}
		>
			<div
				className={cn(
					"pt-0 pb-3 text-muted-foreground leading-relaxed [&_a]:hover:text-foreground h-(--radix-accordion-content-height) [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
					className,
				)}
			>
				{children}
			</div>
		</AccordionPrimitive.Content>
	);
}

/**
 * A single disclosure unit pairing an `AccordionTrigger` with its
 * `AccordionContent`; renders a bottom border except on the last item.
 */
function AccordionItem({
	className,
	...props
}: Readonly<React.ComponentProps<typeof AccordionPrimitive.Item>>) {
	return (
		<AccordionPrimitive.Item
			className={cn("not-last:border-b not-last:border-border", className)}
			data-slot="accordion-item"
			{...props}
		/>
	);
}

/**
 * Clickable header that toggles its panel; swaps a caret-down/up icon to
 * signal the expanded state and carries the full ARIA wiring from Radix.
 */
function AccordionTrigger({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof AccordionPrimitive.Trigger>>) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				className={cn(
					"focus-visible:ring-ring/50 focus-visible:border-ring **:data-[slot=accordion-trigger-icon]:text-hint rounded-lg px-3 py-3 text-left text-sm text-foreground hover:bg-card focus-visible:ring-[3px] **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-colors outline-none disabled:pointer-events-none disabled:opacity-50",
					className,
				)}
				data-slot="accordion-trigger"
				{...props}
			>
				{children}
				<CaretDownIcon
					className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
					data-slot="accordion-trigger-icon"
					weight="light"
				/>
				<CaretUpIcon
					className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
					data-slot="accordion-trigger-icon"
					weight="light"
				/>
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
