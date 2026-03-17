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

import { Popover as PopoverPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function Popover({ ...props }: Readonly<React.ComponentProps<typeof PopoverPrimitive.Root>>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverAnchor({
	...props
}: Readonly<React.ComponentProps<typeof PopoverPrimitive.Anchor>>) {
	return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({
	align = "center",
	className,
	sideOffset = 4,
	...props
}: Readonly<React.ComponentProps<typeof PopoverPrimitive.Content>>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				className={cn(
					"bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 flex flex-col gap-2.5 rounded-lg p-2.5 text-sm shadow-md ring-1 duration-100 z-50 w-72 origin-(--radix-popover-content-transform-origin) outline-hidden",
					className,
				)}
				data-slot="popover-content"
				sideOffset={sideOffset}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

function PopoverDescription({ className, ...props }: Readonly<React.ComponentProps<"p">>) {
	return (
		<p
			className={cn("text-muted-foreground", className)}
			data-slot="popover-description"
			{...props}
		/>
	);
}

function PopoverHeader({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn("flex flex-col gap-0.5 text-sm", className)}
			data-slot="popover-header"
			{...props}
		/>
	);
}

function PopoverTitle({ className, ...props }: Readonly<React.ComponentProps<"h2">>) {
	return <div className={cn("font-medium", className)} data-slot="popover-title" {...props} />;
}

function PopoverTrigger({
	...props
}: Readonly<React.ComponentProps<typeof PopoverPrimitive.Trigger>>) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
};
