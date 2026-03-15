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

import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function Tabs({
	className,
	orientation = "horizontal",
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			className={cn("gap-2 group/tabs flex data-[orientation=horizontal]:flex-col", className)}
			data-orientation={orientation}
			data-slot="tabs"
			{...props}
		/>
	);
}

const tabsListVariants = cva(
	"rounded-[6px] border border-border bg-surface p-[3px] group-data-horizontal/tabs:h-9 data-[variant=line]:rounded-none data-[variant=line]:border-0 data-[variant=line]:bg-transparent group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "",
				line: "gap-1 bg-transparent",
			},
		},
	},
);

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			className={cn("text-sm flex-1 outline-none", className)}
			data-slot="tabs-content"
			{...props}
		/>
	);
}

function TabsList({
	className,
	variant = "default",
	...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			className={cn(tabsListVariants({ variant }), className)}
			data-slot="tabs-list"
			data-variant={variant}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			className={cn(
				"gap-1.5 rounded-[4px] border border-transparent px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] group-data-[variant=default]/tabs-list:data-active:shadow-none group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:border-transparent group-data-[variant=line]/tabs-list:hover:bg-transparent",
				"data-active:bg-card data-active:text-foreground data-active:border-border",
				"after:bg-primary after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
				className,
			)}
			data-slot="tabs-trigger"
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, tabsListVariants, TabsTrigger };
