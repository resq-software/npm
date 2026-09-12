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
 * @fileoverview StatusAnnouncer — the console's single live region.
 *
 * The instinct is to give every panel its own `aria-live`. Do that and a
 * console with twelve panels has twelve regions competing: a battery warning
 * interrupts a command acknowledgement which interrupts a dropout notice, and a
 * screen-reader user hears fragments of all three and the whole of none.
 *
 * One region, owned by the shell, which decides what is worth saying and in
 * what order. Panels report upward; they do not announce.
 *
 * Two details this component exists to get right:
 *
 * - The region must be **in the DOM before the message changes**. A live region
 *   mounted together with its first message is frequently missed entirely, so
 *   the container renders unconditionally and only the text varies.
 * - `assertive` interrupts whatever is being read. That is right for a failsafe
 *   trigger and hostile for a routine acknowledgement, so urgency is an
 *   explicit decision rather than a default.
 *
 * Stateless and hook-free. Visually hidden but never `display: none`, which
 * would remove it from the accessibility tree along with the visual one.
 *
 * @module @resq-systems/ui/components/status-announcer/status-announcer
 */

import type * as React from "react";

import { cn } from "../../lib/utils.js";

//#region Types

/** How badly this needs to interrupt whatever is currently being read. */
export type AnnouncementUrgency = "polite" | "assertive";

export interface StatusAnnouncerProps extends Omit<React.ComponentProps<"div">, "children"> {
	/** The text to announce. Changing it is what triggers the announcement. */
	message?: string;
	/** Defaults to `polite`; reserve `assertive` for what cannot wait. */
	urgency?: AnnouncementUrgency;
}

//#endregion

//#region Component

/**
 * The console's one live region.
 *
 * @example
 * ```tsx
 * <StatusAnnouncer message={announcement} urgency={isCritical ? "assertive" : "polite"} />
 * ```
 */
function StatusAnnouncer({
	message,
	urgency = "polite",
	className,
	...props
}: Readonly<StatusAnnouncerProps>) {
	return (
		<div
			{...props}
			aria-atomic="true"
			aria-live={urgency}
			className={cn("sr-only", className)}
			data-slot="status-announcer"
			data-urgency={urgency}
			// `alert` carries implicit assertive semantics that some screen readers
			// honour even where `aria-live` alone is applied inconsistently.
			role={urgency === "assertive" ? "alert" : "status"}
		>
			{message ?? ""}
		</div>
	);
}

//#endregion

export { StatusAnnouncer };
