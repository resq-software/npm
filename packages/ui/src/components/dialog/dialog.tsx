/*
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
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";
import { Button } from "../button/button.js";

function Dialog({ ...props }: Readonly<React.ComponentProps<typeof DialogPrimitive.Root>>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogClose({ ...props }: Readonly<React.ComponentProps<typeof DialogPrimitive.Close>>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
	children,
	className,
	showCloseButton = true,
	...props
}: Readonly<
	React.ComponentProps<typeof DialogPrimitive.Content> & {
		showCloseButton?: boolean;
	}
>) {
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				className={cn(
					"bg-card text-card-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 grid max-w-[calc(100%-2rem)] gap-4 rounded-lg border border-border p-5 text-sm shadow-xl duration-100 sm:max-w-sm fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none",
					className,
				)}
				data-slot="dialog-content"
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close asChild data-slot="dialog-close">
						<Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
							<XIcon weight="light" />
							<span className="sr-only">Close</span>
						</Button>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogDescription({
	className,
	...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Description>>) {
	return (
		<DialogPrimitive.Description
			className={cn(
				"text-muted-foreground *:[a]:hover:text-foreground text-sm leading-relaxed *:[a]:underline *:[a]:underline-offset-3",
				className,
			)}
			data-slot="dialog-description"
			{...props}
		/>
	);
}

function DialogFooter({
	children,
	className,
	showCloseButton = false,
	...props
}: Readonly<
	React.ComponentProps<"div"> & {
		showCloseButton?: boolean;
	}
>) {
	return (
		<div
			className={cn(
				"bg-surface -mx-5 -mb-5 rounded-b-[6px] border-t border-border p-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className,
			)}
			data-slot="dialog-footer"
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close asChild>
					<Button variant="outline">Close</Button>
				</DialogPrimitive.Close>
			)}
		</div>
	);
}

function DialogHeader({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div className={cn("gap-2 flex flex-col", className)} data-slot="dialog-header" {...props} />
	);
}

function DialogOverlay({
	className,
	...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Overlay>>) {
	return (
		<DialogPrimitive.Overlay
			className={cn(
				"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-background/70 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-50",
				className,
			)}
			data-slot="dialog-overlay"
			{...props}
		/>
	);
}

function DialogPortal({ ...props }: Readonly<React.ComponentProps<typeof DialogPrimitive.Portal>>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogTitle({
	className,
	...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Title>>) {
	return (
		<DialogPrimitive.Title
			className={cn("font-display text-lg leading-tight font-bold tracking-[-0.03em]", className)}
			data-slot="dialog-title"
			{...props}
		/>
	);
}

function DialogTrigger({
	...props
}: Readonly<React.ComponentProps<typeof DialogPrimitive.Trigger>>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
