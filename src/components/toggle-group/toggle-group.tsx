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

import type { VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../../lib/utils.js";
import { toggleVariants } from "../toggle/toggle.js";

const ToggleGroupContext = React.createContext<
	VariantProps<typeof toggleVariants> & {
		orientation?: "horizontal" | "vertical";
		spacing?: number;
	}
>({
	orientation: "horizontal",
	size: "default",
	spacing: 0,
	variant: "default",
});

function ToggleGroup({
	children,
	className,
	orientation = "horizontal",
	size,
	spacing = 0,
	variant,
	...props
}: Readonly<
	React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
		VariantProps<typeof toggleVariants> & {
			orientation?: "horizontal" | "vertical";
			spacing?: number;
		}
>) {
	return (
		<ToggleGroupPrimitive.Root
			className={cn(
				"rounded-lg data-[size=sm]:rounded-md group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
				className,
			)}
			data-orientation={orientation}
			data-size={size}
			data-slot="toggle-group"
			data-spacing={spacing}
			data-variant={variant}
			style={{ "--gap": spacing } as React.CSSProperties}
			{...props}
		>
			<ToggleGroupContext.Provider
				value={React.useMemo(
					() => ({ orientation, size, spacing, variant }),
					[orientation, size, spacing, variant],
				)}
			>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive.Root>
	);
}

function ToggleGroupItem({
	children,
	className,
	size = "default",
	variant = "default",
	...props
}: Readonly<
	React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>
>) {
	const context = React.useContext(ToggleGroupContext);

	return (
		<ToggleGroupPrimitive.Item
			className={cn(
				"group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-[6px] group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-[6px] group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-[6px] group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-[6px] shrink-0 focus:z-10 focus-visible:z-10 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
				toggleVariants({
					size: context.size ?? size,
					variant: context.variant ?? variant,
				}),
				className,
			)}
			data-size={context.size ?? size}
			data-slot="toggle-group-item"
			data-spacing={context.spacing}
			data-variant={context.variant ?? variant}
			{...props}
		>
			{children}
		</ToggleGroupPrimitive.Item>
	);
}

export { ToggleGroup, ToggleGroupItem };
