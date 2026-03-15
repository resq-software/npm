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

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "../../lib/utils.js";
import { Separator } from "../separator/separator.js";

const buttonGroupVariants = cva(
	"has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-[6px] flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
	{
		defaultVariants: {
			orientation: "horizontal",
		},
		variants: {
			orientation: {
				horizontal:
					"[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-[6px]! [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
				vertical:
					"[&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-[6px]! flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
			},
		},
	},
);

function ButtonGroup({
	className,
	orientation,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
	return (
		<div
			className={cn(buttonGroupVariants({ orientation }), className)}
			data-orientation={orientation}
			data-slot="button-group"
			role="group"
			{...props}
		/>
	);
}

function ButtonGroupSeparator({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			className={cn(
				"bg-border relative self-stretch data-[orientation=horizontal]:mx-px data-[orientation=horizontal]:w-auto data-[orientation=vertical]:my-px data-[orientation=vertical]:h-auto",
				className,
			)}
			data-slot="button-group-separator"
			orientation={orientation}
			{...props}
		/>
	);
}

function ButtonGroupText({
	asChild = false,
	className,
	...props
}: React.ComponentProps<"div"> & {
	asChild?: boolean;
}) {
	const Comp = asChild ? Slot.Root : "div";

	return (
		<Comp
			className={cn(
				"bg-surface text-hint gap-2 rounded-[6px] border border-border px-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] [&_svg:not([class*='size-'])]:size-4 flex items-center [&_svg]:pointer-events-none",
				className,
			)}
			{...props}
		/>
	);
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
