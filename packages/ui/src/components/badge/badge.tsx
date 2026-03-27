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

const badgeVariants = cva(
	"h-5 gap-1 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive overflow-hidden group/badge",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "border-success/30 bg-success/10 text-success-text",
				destructive: "border-destructive/30 bg-destructive/10 text-destructive-text",
				ghost: "border-transparent bg-transparent text-muted-foreground",
				link: "border-transparent bg-transparent text-info-text underline-offset-4 hover:underline",
				outline: "border-border bg-mono/8 text-hint",
				secondary: "border-info/30 bg-info/10 text-info-text",
			},
		},
	},
);

function Badge({
	asChild = false,
	className,
	variant = "default",
	...props
}: Readonly<
	React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }
>) {
	const Comp = asChild ? Slot.Root : "span";

	return (
		<Comp
			className={cn(badgeVariants({ variant }), className)}
			data-slot="badge"
			data-variant={variant}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
