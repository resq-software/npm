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
 * @fileoverview Collapsible component family — single-panel
 * disclosure built on Radix UI's `Collapsible` primitive. Use for
 * "show more" / "expand details" patterns where you don't need
 * the multi-section coordination of `Accordion`.
 *
 * Composition: `Collapsible > CollapsibleTrigger + CollapsibleContent`.
 *
 * @module @resq-systems/ui/components/collapsible/collapsible
 */

"use client";

import { Collapsible as CollapsiblePrimitive } from "radix-ui";

/** Root of a single-panel disclosure; owns the open/closed state. */
function Collapsible({
	...props
}: Readonly<React.ComponentProps<typeof CollapsiblePrimitive.Root>>) {
	return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/** The region shown or hidden as the collapsible toggles. */
function CollapsibleContent({
	...props
}: Readonly<React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>>) {
	return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...props} />;
}

/** Control that toggles the collapsible open or closed. */
function CollapsibleTrigger({
	...props
}: Readonly<React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>>) {
	return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
