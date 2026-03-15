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

import { Progress as ProgressPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function Progress({
	className,
	value,
	...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
	return (
		<ProgressPrimitive.Root
			className={cn(
				"bg-surface border border-border h-2 rounded-full relative flex w-full items-center overflow-x-hidden",
				className,
			)}
			data-slot="progress"
			{...props}
		>
			<ProgressPrimitive.Indicator
				className="bg-primary size-full flex-1 rounded-full shadow-[0_0_18px_color-mix(in_oklab,var(--color-primary)_40%,transparent)] transition-all"
				data-slot="progress-indicator"
				style={{ transform: `translateX(-${String(100 - (value ?? 0))}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
