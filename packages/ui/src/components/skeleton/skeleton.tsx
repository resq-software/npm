/**
 * Copyright 2026 ResQ Systems, Inc.
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

/**
 * @fileoverview Skeleton — pulsing placeholder shape used while
 * content loads. Compose multiple `<Skeleton>` with sizing classes
 * (`h-*`, `w-*`) to mimic the shape of the loaded UI so layout
 * stays stable when real content arrives.
 *
 * Animation uses `animate-pulse` (compositor-friendly opacity), so
 * many skeletons can render at once without dropping frames.
 *
 * @module @resq-systems/ui/components/skeleton/skeleton
 */

import { cn } from "../../lib/utils.js";

function Skeleton({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
	return (
		<div
			className={cn("bg-muted rounded-md animate-pulse", className)}
			data-slot="skeleton"
			{...props}
		/>
	);
}

export { Skeleton };
