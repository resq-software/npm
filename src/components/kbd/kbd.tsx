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

import { cn } from "../../lib/utils.js";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			className={cn(
				"bg-surface text-mono [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-foreground h-5 w-fit min-w-5 gap-1 rounded-[3px] border border-border px-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex items-center justify-center select-none",
				className,
			)}
			data-slot="kbd"
			{...props}
		/>
	);
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<kbd
			className={cn("gap-1 inline-flex items-center", className)}
			data-slot="kbd-group"
			{...props}
		/>
	);
}

export { Kbd, KbdGroup };
