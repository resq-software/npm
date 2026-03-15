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

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
	return (
		<AccordionPrimitive.Root
			className={cn("flex w-full flex-col", className)}
			data-slot="accordion"
			{...props}
		/>
	);
}

function AccordionContent({
	children,
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
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

function AccordionItem({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
	return (
		<AccordionPrimitive.Item
			className={cn("not-last:border-b not-last:border-border", className)}
			data-slot="accordion-item"
			{...props}
		/>
	);
}

function AccordionTrigger({
	children,
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				className={cn(
					"focus-visible:ring-ring/50 focus-visible:border-ring **:data-[slot=accordion-trigger-icon]:text-hint rounded-[6px] px-3 py-3 text-left text-sm text-foreground hover:bg-card focus-visible:ring-[3px] **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
					className,
				)}
				data-slot="accordion-trigger"
				{...props}
			>
				{children}
				<ChevronDownIcon
					className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
					data-slot="accordion-trigger-icon"
				/>
				<ChevronUpIcon
					className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
					data-slot="accordion-trigger-icon"
				/>
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
