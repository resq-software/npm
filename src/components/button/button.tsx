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
import type * as React from "react";

import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
	"focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive rounded-[4px] border border-transparent bg-clip-padding font-mono text-[11px] font-medium leading-none uppercase tracking-[0.1em] focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
	{
		defaultVariants: {
			size: "default",
			variant: "default",
		},
		variants: {
			size: {
				default:
					"h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
				icon: "size-9",
				"icon-lg": "size-10",
				"icon-sm": "size-8 rounded-[4px] in-data-[slot=button-group]:rounded-[4px]",
				"icon-xs":
					"size-7 rounded-[4px] in-data-[slot=button-group]:rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
				lg: "h-10 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				sm: "h-7 gap-1 px-2.5 rounded-[4px] text-[10px] in-data-[slot=button-group]:rounded-[4px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
				xs: "h-7 gap-1 rounded-[4px] px-2 text-[10px] in-data-[slot=button-group]:rounded-[4px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
			},
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				destructive:
					"border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
				ghost:
					"border-border text-muted-foreground hover:border-border-hover hover:text-foreground aria-expanded:border-border-hover aria-expanded:text-foreground",
				link: "border-transparent text-info underline-offset-4 hover:underline",
				outline:
					"border-primary bg-transparent text-primary hover:bg-primary/10 aria-expanded:bg-primary/10",
				secondary:
					"border-border bg-surface text-foreground hover:border-border-hover hover:bg-card",
				urgent: "border-info bg-background text-info hover:bg-info/10",
			},
		},
	},
);

function Button({
	asChild = false,
	className,
	size = "default",
	variant = "default",
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			className={cn(buttonVariants({ className, size, variant }))}
			data-size={size}
			data-slot="button"
			data-variant={variant}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
