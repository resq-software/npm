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

/**
 * @fileoverview ScrollArea component family — themed scroll
 * container with consistent scrollbar styling across browsers,
 * built on Radix UI's `ScrollArea` primitive. Use when native
 * scrollbar appearance varies across platforms in a way that
 * breaks the design.
 *
 * Composition: `ScrollArea > [content] + ScrollBar*`. Note that
 * Radix renders the bars only when scrolling is needed and uses
 * pointer-events targeting that doesn't intercept clicks on the
 * content.
 */

"use client";

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function ScrollArea({
	children,
	className,
	...props
}: Readonly<React.ComponentProps<typeof ScrollAreaPrimitive.Root>>) {
	return (
		<ScrollAreaPrimitive.Root
			className={cn("relative", className)}
			data-slot="scroll-area"
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
				data-slot="scroll-area-viewport"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

function ScrollBar({
	className,
	orientation = "vertical",
	...props
}: Readonly<React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>>) {
	return (
		<ScrollAreaPrimitive.ScrollAreaScrollbar
			className={cn(
				"data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent flex touch-none p-px transition-colors select-none",
				className,
			)}
			data-orientation={orientation}
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			{...props}
		>
			<ScrollAreaPrimitive.ScrollAreaThumb
				className="rounded-full bg-border relative flex-1"
				data-slot="scroll-area-thumb"
			/>
		</ScrollAreaPrimitive.ScrollAreaScrollbar>
	);
}

export { ScrollArea, ScrollBar };
