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
 * @fileoverview Label — accessible form label built on
 * Radix UI's `Label` primitive (clicking the label focuses the
 * associated control). Per `STYLE_GUIDE.md`, labels render
 * `font-mono uppercase` with wide letter-spacing and the
 * `text-hint` token for muted labelling.
 *
 * Auto-dims to 50% opacity when its peer (`peer-disabled:`) or its
 * group ancestor (`group-data-[disabled=true]:`) is disabled. The
 * group case also blocks pointer events; the peer case shows a
 * `not-allowed` cursor without disabling clicks (so the label
 * still focuses its associated input).
 *
 * @module @resq-systems/ui/components/label/label
 */

"use client";

import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils.js";

/**
 * Form label that focuses its associated control on click and auto-dims when
 * its peer input or group ancestor is disabled.
 */
function Label({
	className,
	...props
}: Readonly<React.ComponentProps<typeof LabelPrimitive.Root>>) {
	return (
		<LabelPrimitive.Root
			className={cn(
				"text-hint gap-2 font-mono text-[10px] leading-none font-medium uppercase tracking-[0.18em] group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
				className,
			)}
			data-slot="label"
			{...props}
		/>
	);
}

export { Label };
