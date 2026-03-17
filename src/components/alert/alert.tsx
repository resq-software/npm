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
import type * as React from "react";

import { cn } from "../../lib/utils.js";

const alertVariants = cva(
	"grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 w-full relative group/alert",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "bg-card text-card-foreground",
				destructive:
					"text-destructive-text bg-card *:data-[slot=alert-description]:text-destructive-text *:[svg]:text-current",
			},
		},
	},
);

function Alert({
	className,
	variant,
	...props
}: Readonly<React.ComponentProps<"div"> & VariantProps<typeof alertVariants>>) {
	return (
		<div
			className={cn(alertVariants({ variant }), className)}
			data-slot="alert"
			role="alert"
			{...props}
		/>
	);
}

function AlertAction({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div className={cn("absolute top-2 right-2", className)} data-slot="alert-action" {...props} />
	);
}

function AlertDescription({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
				className,
			)}
			data-slot="alert-description"
			{...props}
		/>
	);
}

function AlertTitle({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn(
				"font-medium group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
				className,
			)}
			data-slot="alert-title"
			{...props}
		/>
	);
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
