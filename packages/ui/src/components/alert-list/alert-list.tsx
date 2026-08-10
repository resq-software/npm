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
 * @fileoverview AlertList — the console's fault list.
 *
 * A naive fault list is wrong in three specific ways, and each one loses
 * information the operator needed:
 *
 * 1. **Latching.** A fault that clears must stay visible until acknowledged.
 *    Without it a momentary overcurrent appears and vanishes between glances,
 *    and the one person who needed to see it never does.
 * 2. **Deduplication.** A 10 Hz feed repeating one fault is a single row with a
 *    count and a first/last-seen, not six hundred rows. Ordering is by severity
 *    then age, so a burst cannot bury an older, worse fault.
 * 3. **Stable ordering.** Rows must not reshuffle under the cursor while an
 *    operator reaches for acknowledge. Order depends only on severity, ack
 *    state, active state and first-seen — never on last-seen, which changes on
 *    every repeat.
 *
 * Severity is carried by a word as well as a colour, because a console full of
 * amber and red is exactly where colour-only encoding fails.
 *
 * Stateless: the store that latches, dedupes and counts lives in the shell.
 * This renders what it is handed and reports acknowledgements upward.
 *
 * @module @resq-systems/ui/components/alert-list/alert-list
 */

import type * as React from "react";

import { cn } from "../../lib/utils.js";

//#region Types

/** Ordered worst-first; the rank below is the sort key. */
export type AlertSeverity = "critical" | "warning" | "info";

const SEVERITY_RANK: Record<AlertSeverity, number> = {
	critical: 0,
	info: 2,
	warning: 1,
};

const SEVERITY_TONE: Record<AlertSeverity, string> = {
	critical: "border-l-destructive text-destructive",
	info: "border-l-info text-info",
	warning: "border-l-warning text-warning",
};

/** A single console alert, already deduplicated by the caller's store. */
export interface ConsoleAlert {
	/** Stable identity, used for dedupe and acknowledgement. */
	id: string;
	severity: AlertSeverity;
	/** Operator-facing text. */
	message: string;
	/** Where it came from, e.g. `"battery"` or a ROS node name. */
	source?: string;
	/** How many times this alert has been reported since it first appeared. */
	count?: number;
	/** Whether the underlying condition is still present. */
	active?: boolean;
	/** Whether an operator has acknowledged it. */
	acknowledged?: boolean;
	/** Epoch milliseconds of first occurrence; the tiebreak for ordering. */
	firstSeen?: number;
}

export interface AlertListProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
	alerts?: readonly ConsoleAlert[];
	/** Called with an alert id when the operator acknowledges it. */
	onAcknowledge?: (id: string) => void;
	/** Rows rendered before truncating; the remainder is summarised in one line. */
	maxVisible?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

//#endregion

//#region Helpers

/** Rank worst-first, then unacknowledged, then active, then oldest. */
function compareAlerts(left: ConsoleAlert, right: ConsoleAlert): number {
	const bySeverity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
	if (bySeverity !== 0) return bySeverity;

	// An unacknowledged alert outranks one already seen.
	const leftAck = left.acknowledged === true ? 1 : 0;
	const rightAck = right.acknowledged === true ? 1 : 0;
	if (leftAck !== rightAck) return leftAck - rightAck;

	// A live condition outranks one that cleared but is still latched.
	const leftCleared = left.active === false ? 1 : 0;
	const rightCleared = right.active === false ? 1 : 0;
	if (leftCleared !== rightCleared) return leftCleared - rightCleared;

	// Oldest first. Never `lastSeen`: it changes on every repeat and would make
	// rows jump while the operator is reaching for acknowledge.
	return (left.firstSeen ?? 0) - (right.firstSeen ?? 0);
}

/** Screen-reader summary: counts, not a recital of every row. */
function formatAlertLabel(alerts: readonly ConsoleAlert[]): string {
	if (alerts.length === 0) return "Alerts, none";

	const counts = { critical: 0, info: 0, warning: 0 };
	let unacknowledged = 0;
	for (const alert of alerts) {
		counts[alert.severity] += 1;
		if (alert.acknowledged !== true) unacknowledged += 1;
	}

	const parts: string[] = [];
	if (counts.critical > 0) parts.push(`${counts.critical} critical`);
	if (counts.warning > 0) parts.push(`${counts.warning} warning`);
	if (counts.info > 0) parts.push(`${counts.info} info`);

	return `Alerts, ${parts.join(", ")}, ${unacknowledged} unacknowledged`;
}

//#endregion

//#region Component

/**
 * Ranked, acknowledgeable fault list.
 *
 * @example
 * ```tsx
 * <AlertList alerts={alerts} onAcknowledge={ack} maxVisible={8} />
 * ```
 */
function AlertList({
	alerts,
	onAcknowledge,
	maxVisible = 12,
	label,
	className,
	...props
}: Readonly<AlertListProps>) {
	// Spread first: sorting the caller's array in place would mutate a prop.
	const ranked = [...(alerts ?? [])].sort(compareAlerts);
	const shown = ranked.slice(0, Math.max(0, maxVisible));
	const hidden = ranked.length - shown.length;

	return (
		<div
			{...props}
			aria-label={label ?? formatAlertLabel(ranked)}
			className={cn("flex flex-col gap-1", className)}
			data-slot="alert-list"
			role="group"
		>
			{ranked.length === 0 ? (
				<p className="px-1 py-2 font-mono text-[11px] text-muted-foreground uppercase">
					No active alerts
				</p>
			) : null}

			{shown.map((alert) => (
				<div
					className={cn(
						"flex items-start gap-2 border-l-2 bg-muted/40 px-2 py-1",
						SEVERITY_TONE[alert.severity],
						alert.acknowledged === true && "opacity-55",
					)}
					data-acknowledged={alert.acknowledged === true ? "" : undefined}
					data-cleared={alert.active === false ? "" : undefined}
					data-severity={alert.severity}
					data-slot="alert-list-item"
					key={alert.id}
				>
					<span className="w-14 shrink-0 font-mono text-[9px] uppercase leading-4">
						{alert.severity}
					</span>

					<div className="min-w-0 flex-1">
						<p className="truncate text-[12px] text-foreground leading-4">{alert.message}</p>
						<p className="font-mono text-[9px] text-muted-foreground uppercase">
							{alert.source ?? "system"}
							{alert.active === false ? " / cleared" : ""}
							{alert.count !== undefined && alert.count > 1 ? ` / x${alert.count}` : ""}
						</p>
					</div>

					{onAcknowledge === undefined || alert.acknowledged === true ? null : (
						<button
							className="shrink-0 rounded-[3px] border border-border px-1 font-mono text-[9px] text-muted-foreground uppercase leading-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => onAcknowledge(alert.id)}
							type="button"
						>
							Ack
						</button>
					)}
				</div>
			))}

			{hidden > 0 ? (
				<p className="px-1 font-mono text-[9px] text-muted-foreground uppercase">
					{`+${hidden} more`}
				</p>
			) : null}
		</div>
	);
}

//#endregion

export { AlertList };
