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
 * @fileoverview PanelFrame — the chrome every console panel shares.
 *
 * The instruments carry their own `stale` treatment. Panels that are not
 * instruments — video, charts, lists — need the same treatment applied
 * uniformly, or staleness would mean one thing inside a gauge and nothing
 * beside it.
 *
 * `priority` is not decoration: the console grid degrades by priority rather
 * than by ad-hoc breakpoints, so a panel declares its importance once and the
 * layout obeys it at every width.
 *
 * Stateless and hook-free. Collapse is controlled by the caller, because the
 * shell owns layout state and persists it; a panel that collapsed itself would
 * lose that on remount.
 *
 * @module @resq-systems/ui/components/panel-frame/panel-frame
 */

import type * as React from "react";

import { cn } from "../../lib/utils.js";

//#region Types

/**
 * How the console grid should treat this panel as space runs out. `primary`
 * survives to the narrowest layout; `ancillary` is the first to be tabbed away.
 */
export type PanelPriority = "primary" | "secondary" | "ancillary";

export interface PanelFrameProps extends React.ComponentProps<"section"> {
	/** Panel title, rendered in the header and used as the accessible name. */
	title: string;
	/** Layout priority; the grid degrades ancillary panels first. */
	priority?: PanelPriority;
	/**
	 * Marks the panel's data as no longer trustworthy. Dims the body and badges
	 * the header, matching the instrument treatment so staleness reads the same
	 * everywhere on the console.
	 */
	stale?: boolean;
	/** Controls rendered at the right of the header, e.g. a unit toggle. */
	actions?: React.ReactNode;
	/** Hides the body. Controlled, because the shell owns and persists layout. */
	collapsed?: boolean;
	/** Replaces the body entirely when the panel's source has failed. */
	error?: React.ReactNode;
}

//#endregion

//#region Component

/**
 * Shared chrome for a console panel.
 *
 * @example
 * ```tsx
 * <PanelFrame title="Depth" priority="primary" stale={isStale(t, now)}>
 *   <DepthGauge depth={12.4} seabed={16} />
 * </PanelFrame>
 * ```
 */
function PanelFrame({
	title,
	priority = "secondary",
	stale,
	actions,
	collapsed,
	error,
	className,
	children,
	...props
}: Readonly<PanelFrameProps>) {
	return (
		<section
			{...props}
			aria-label={stale === true ? `Stale, ${title}` : title}
			className={cn(
				"flex min-w-0 flex-col overflow-hidden rounded-[6px] border border-border bg-card",
				className,
			)}
			data-collapsed={collapsed === true ? "" : undefined}
			data-priority={priority}
			data-slot="panel-frame"
			data-stale={stale === true ? "" : undefined}
		>
			<header className="flex shrink-0 items-center gap-2 border-border border-b px-2 py-1">
				<h2 className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground uppercase">
					{title}
				</h2>
				{stale === true ? (
					<span className="rounded-[3px] bg-destructive px-1 py-px font-mono text-[9px] uppercase leading-none text-destructive-foreground">
						Stale
					</span>
				) : null}
				{actions === undefined ? null : <div className="flex shrink-0 items-center">{actions}</div>}
			</header>

			{collapsed === true ? null : (
				<div
					className={cn(
						"min-h-0 flex-1 overflow-auto p-2",
						stale === true && error === undefined && "opacity-45",
					)}
				>
					{error ?? children}
				</div>
			)}
		</section>
	);
}

//#endregion

export { PanelFrame };
