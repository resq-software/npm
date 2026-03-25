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

import { XIcon } from "@phosphor-icons/react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";
import { Button } from "../button/button.js";

function Sheet({ ...props }: Readonly<React.ComponentProps<typeof SheetPrimitive.Root>>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetClose({ ...props }: Readonly<React.ComponentProps<typeof SheetPrimitive.Close>>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
	children,
	className,
	showCloseButton = true,
	side = "right",
	...props
}: Readonly<
	React.ComponentProps<typeof SheetPrimitive.Content> & {
		showCloseButton?: boolean;
		side?: "bottom" | "left" | "right" | "top";
	}
>) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Content
				className={cn(
					"bg-card text-card-foreground data-open:animate-in data-closed:animate-out data-[side=right]:data-closed:slide-out-to-right-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=top]:data-closed:slide-out-to-top-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:fade-out-0 data-open:fade-in-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=bottom]:data-open:slide-in-from-bottom-10 fixed z-50 flex flex-col gap-4 bg-clip-padding text-sm shadow-xl transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm border-border",
					className,
				)}
				data-side={side}
				data-slot="sheet-content"
				{...props}
			>
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close asChild data-slot="sheet-close">
						<Button className="absolute top-3 right-3" size="icon-sm" variant="ghost">
							<XIcon weight="light" />
							<span className="sr-only">Close</span>
						</Button>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Content>
		</SheetPortal>
	);
}

function SheetDescription({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SheetPrimitive.Description>>) {
	return (
		<SheetPrimitive.Description
			className={cn("text-muted-foreground text-sm leading-relaxed", className)}
			data-slot="sheet-description"
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn("gap-2 p-5 mt-auto border-t border-border bg-surface flex flex-col", className)}
			data-slot="sheet-footer"
			{...props}
		/>
	);
}

function SheetHeader({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div className={cn("gap-1 p-5 flex flex-col", className)} data-slot="sheet-header" {...props} />
	);
}

function SheetOverlay({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SheetPrimitive.Overlay>>) {
	return (
		<SheetPrimitive.Overlay
			className={cn(
				"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-background/70 duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50",
				className,
			)}
			data-slot="sheet-overlay"
			{...props}
		/>
	);
}

function SheetPortal({ ...props }: Readonly<React.ComponentProps<typeof SheetPrimitive.Portal>>) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetTitle({
	className,
	...props
}: Readonly<React.ComponentProps<typeof SheetPrimitive.Title>>) {
	return (
		<SheetPrimitive.Title
			className={cn("font-display text-lg font-bold tracking-[-0.03em]", className)}
			data-slot="sheet-title"
			{...props}
		/>
	);
}

function SheetTrigger({ ...props }: Readonly<React.ComponentProps<typeof SheetPrimitive.Trigger>>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
};
