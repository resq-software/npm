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

import { Separator as SeparatorPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

function Separator({
	className,
	decorative = true,
	orientation = "horizontal",
	...props
}: Readonly<React.ComponentProps<typeof SeparatorPrimitive.Root>>) {
	return (
		<SeparatorPrimitive.Root
			className={cn(
				"bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
				className,
			)}
			data-slot="separator"
			decorative={decorative}
			orientation={orientation}
			{...props}
		/>
	);
}

export { Separator };
