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
 * @fileoverview LinkQuality — the health of the *link*, deliberately separate
 * from the health of the vehicle.
 *
 * Conflating the two is how an operator reads a comms dropout as a vehicle
 * fault and takes the wrong action. Every instrument on the console can be
 * stale for exactly one reason — the link — and this panel is the answer to
 * "why", which is why it reports signal, loss, latency and fix as four
 * independent facts rather than one blended "connection" score.
 *
 * Severity is never colour alone: each row carries a word, so the panel still
 * reads in sunlight and to a colour-blind operator.
 *
 * Stateless and hook-free; every value is optional because a link that cannot
 * report a field must show it unknown rather than zero.
 *
 * @module @resq-systems/ui/components/link-quality/link-quality
 */

import type * as React from "react";

import { isReading } from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Constants

/** RSSI in dBm at or below which the signal is called poor / marginal. */
const RSSI_POOR = -90;
const RSSI_MARGINAL = -75;
/** Packet loss percentages at which the link is called marginal / poor. */
const LOSS_MARGINAL = 2;
const LOSS_POOR = 10;
/** Round-trip latency in ms at which commanding becomes questionable. */
const LATENCY_MARGINAL = 250;
const LATENCY_POOR = 600;
/** HDOP above which a fix is geometrically weak. */
const HDOP_MARGINAL = 2;
const HDOP_POOR = 5;

const TONE = {
	good: "text-success",
	marginal: "text-warning",
	poor: "text-destructive",
	unknown: "text-muted-foreground",
} as const;

//#endregion

//#region Types

/** GNSS fix quality, worst to best. */
export type GnssFix = "none" | "2d" | "3d" | "dgps" | "rtk";

/** How good a single measurement is. */
export type LinkGrade = "good" | "marginal" | "poor" | "unknown";

export interface LinkQualityProps extends React.ComponentProps<"div"> {
	/** Received signal strength in dBm (negative). */
	rssi?: number;
	/** Packet loss as a percentage, 0–100. */
	lossPercent?: number;
	/** Round-trip latency in milliseconds. */
	latencyMs?: number;
	/** GNSS fix quality. */
	fix?: GnssFix;
	/** Satellites used in the solution. */
	satellites?: number;
	/** Horizontal dilution of precision. */
	hdop?: number;
	/** Marks the readings themselves as stale. */
	stale?: boolean;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

//#endregion

//#region Helpers

/** Grade a value against thresholds where lower is better. */
function gradeLower(value: number | undefined, marginal: number, poor: number): LinkGrade {
	if (!isReading(value)) return "unknown";
	if (value >= poor) return "poor";
	if (value >= marginal) return "marginal";
	return "good";
}

/** Grade a value against thresholds where higher is better. */
function gradeHigher(value: number | undefined, marginal: number, poor: number): LinkGrade {
	if (!isReading(value)) return "unknown";
	if (value <= poor) return "poor";
	if (value <= marginal) return "marginal";
	return "good";
}

/** Grade a GNSS fix. A 2D fix has no altitude and is not a usable 3D solution. */
function gradeFix(fix: GnssFix | undefined): LinkGrade {
	if (fix === undefined) return "unknown";
	if (fix === "none") return "poor";
	if (fix === "2d") return "marginal";
	return "good";
}

/** Human wording for a fix, spelled out so it is never colour-only. */
function fixWord(fix: GnssFix | undefined): string {
	switch (fix) {
		case "none":
			return "no fix";
		case "2d":
			return "2D fix";
		case "3d":
			return "3D fix";
		case "dgps":
			return "DGPS fix";
		case "rtk":
			return "RTK fix";
		default:
			return "fix unknown";
	}
}

/** Format a reading, or an em dash when it is unknown. */
function show(value: number | undefined, unit: string, digits = 0): string {
	return isReading(value) ? `${value.toFixed(digits)}${unit}` : "—";
}

/** Build a screen-reader sentence describing the link. */
function formatLinkLabel(props: Readonly<LinkQualityProps>): string {
	const parts: string[] = [];
	if (isReading(props.rssi)) parts.push(`signal ${Math.round(props.rssi)} dBm`);
	if (isReading(props.lossPercent))
		parts.push(`${props.lossPercent.toFixed(0)} percent packet loss`);
	if (isReading(props.latencyMs)) parts.push(`${Math.round(props.latencyMs)} millisecond latency`);
	parts.push(fixWord(props.fix));
	if (isReading(props.satellites)) parts.push(`${Math.round(props.satellites)} satellites`);
	if (isReading(props.hdop)) parts.push(`HDOP ${props.hdop.toFixed(1)}`);

	const body = parts.length === 0 ? "no link data" : parts.join(", ");
	return `Link quality, ${body}`;
}

//#endregion

//#region Component

interface RowProps {
	name: string;
	value: string;
	grade: LinkGrade;
	/** The word that carries severity without relying on colour. */
	note: string;
}

function Row({ name, value, grade, note }: Readonly<RowProps>) {
	return (
		<div className="flex items-baseline gap-2">
			<span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground uppercase">
				{name}
			</span>
			<span className={cn("flex-1 font-mono text-[13px] tabular-nums", TONE[grade])}>{value}</span>
			<span className={cn("font-mono text-[9px] uppercase", TONE[grade])}>{note}</span>
		</div>
	);
}

/**
 * Link and GNSS health.
 *
 * @example
 * ```tsx
 * <LinkQuality rssi={-72} lossPercent={1.4} latencyMs={45} fix="rtk" satellites={18} hdop={0.8} />
 * ```
 */
function LinkQuality({
	rssi,
	lossPercent,
	latencyMs,
	fix,
	satellites,
	hdop,
	stale,
	label,
	className,
	...props
}: Readonly<LinkQualityProps>) {
	const signalGrade = gradeHigher(rssi, RSSI_MARGINAL, RSSI_POOR);
	const lossGrade = gradeLower(lossPercent, LOSS_MARGINAL, LOSS_POOR);
	const latencyGrade = gradeLower(latencyMs, LATENCY_MARGINAL, LATENCY_POOR);
	const fixGrade = gradeFix(fix);
	const hdopGrade = gradeLower(hdop, HDOP_MARGINAL, HDOP_POOR);

	const ariaLabel =
		label ?? formatLinkLabel({ fix, hdop, latencyMs, lossPercent, rssi, satellites });

	return (
		<div
			{...props}
			aria-label={stale === true ? `Stale, ${ariaLabel}` : ariaLabel}
			className={cn("flex flex-col gap-1", stale === true && "opacity-45", className)}
			data-slot="link-quality"
			data-stale={stale === true ? "" : undefined}
			role="group"
		>
			<Row grade={signalGrade} name="Signal" note={signalGrade} value={show(rssi, " dBm")} />
			<Row grade={lossGrade} name="Loss" note={lossGrade} value={show(lossPercent, "%", 1)} />
			<Row grade={latencyGrade} name="Latency" note={latencyGrade} value={show(latencyMs, " ms")} />
			<Row grade={fixGrade} name="Fix" note={fixWord(fix)} value={show(satellites, " sats")} />
			<Row grade={hdopGrade} name="HDOP" note={hdopGrade} value={show(hdop, "", 1)} />
		</div>
	);
}

//#endregion

export { LinkQuality };
