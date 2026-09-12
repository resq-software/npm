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
 * @fileoverview TiltIndicator — a ground-vehicle inclinometer rendered as pure
 * SVG. Unlike an artificial horizon, it answers the question a rover operator
 * actually has: *how much rollover margin is left?* Roll and pitch are plotted
 * as one point against an elliptical static-stability envelope, so combined
 * tilt (the case that actually tips a vehicle) reads at a glance.
 *
 * The envelope is normalized — `rollLimit` and `pitchLimit` may differ, and the
 * plotted radius is the combined fraction `hypot(roll/rollLimit,
 * pitch/pitchLimit)`. A fraction of 1.0 sits exactly on the dashed limit ring.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: the geometry follows standard
 * inclinometer / bullseye-level conventions; no third-party instrument source
 * was referenced.
 *
 * @module @resq-systems/ui/components/tilt-indicator/tilt-indicator
 */

import type * as React from "react";

import {
	clamp,
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	safePositive,
	toFinite,
	withStaleness,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Vertical centre of the plot, lifted to leave room for the footer readout. */
const PLOT_CENTER_Y = 104;
/** Radius at which the combined-tilt fraction equals 1.0 (the limit ring). */
const LIMIT_RADIUS = 52;
/** Fraction beyond the limit that still renders inside the box. */
const MAX_FRACTION = 1.4;
/** Fraction at which the readout turns amber. */
const CAUTION_FRACTION = 0.66;

/** Crosshair half-length and dot size. */
const CROSSHAIR = 68;
const DOT_RADIUS = 6;

/** Default per-axis stability limits in degrees. */
const DEFAULT_ROLL_LIMIT = 30;
const DEFAULT_PITCH_LIMIT = 30;

/** Degrees of tilt beyond which display is pointless. */
const TILT_DISPLAY_LIMIT = 90;
const PERCENT = 100;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const SAFE = "var(--success)";
const CAUTION = "var(--warning)";
const DANGER = "var(--destructive)";

//#endregion

//#region Helpers

/** Token for the current envelope usage. */
function statusColor(fraction: number): string {
	if (fraction >= 1) return DANGER;
	if (fraction >= CAUTION_FRACTION) return CAUTION;
	return SAFE;
}

/** Signed degrees rendered with an explicit sign and degree mark. */
function formatDegrees(value: number): string {
	const rounded = Math.round(value);
	return `${rounded > 0 ? "+" : ""}${rounded}°`;
}

/** Build a screen-reader sentence describing the current tilt. */
function formatTiltLabel(roll: number, pitch: number, fraction: number): string {
	const r = Math.round(roll);
	const p = Math.round(pitch);
	const rollPart =
		r === 0 ? "roll level" : `roll ${Math.abs(r)} degrees ${r > 0 ? "right" : "left"}`;
	const pitchPart =
		p === 0 ? "pitch level" : `pitch ${Math.abs(p)} degrees ${p > 0 ? "up" : "down"}`;
	return `Tilt indicator, ${rollPart}, ${pitchPart}, ${Math.round(fraction * PERCENT)} percent of stability limit`;
}

//#endregion

//#region Precomputed static elements

/** Crosshair, caution ring and limit ring — independent of the live reading. */
const PLOT_GRID = (
	<g>
		<line
			stroke={GRID}
			strokeWidth={1}
			x1={CENTER - CROSSHAIR}
			x2={CENTER + CROSSHAIR}
			y1={PLOT_CENTER_Y}
			y2={PLOT_CENTER_Y}
		/>
		<line
			stroke={GRID}
			strokeWidth={1}
			x1={CENTER}
			x2={CENTER}
			y1={PLOT_CENTER_Y - CROSSHAIR}
			y2={PLOT_CENTER_Y + CROSSHAIR}
		/>
		<circle
			cx={CENTER}
			cy={PLOT_CENTER_Y}
			fill="none"
			r={LIMIT_RADIUS * CAUTION_FRACTION}
			stroke={GRID}
			strokeWidth={1}
		/>
		<circle
			cx={CENTER}
			cy={PLOT_CENTER_Y}
			fill="none"
			r={LIMIT_RADIUS}
			stroke={CAUTION}
			strokeDasharray="4 3"
			strokeWidth={1.4}
		/>
	</g>
);

//#endregion

//#region Component

export interface TiltIndicatorProps extends React.ComponentProps<"div"> {
	/** Roll angle in degrees; positive is right-side-down. */
	roll?: number;
	/** Pitch angle in degrees; positive is nose-up. */
	pitch?: number;
	/** Roll angle treated as the rollover limit. Defaults to 30. */
	rollLimit?: number;
	/** Pitch angle treated as the pitchover limit. Defaults to 30. */
	pitchLimit?: number;
	/**
	 * Marks the reading as no longer trustworthy: dims the figure, shows a STALE
	 * badge, sets `data-stale`, and leads the accessible label with "Stale".
	 *
	 * A boolean rather than a timestamp — this component holds no timer and
	 * could not notice itself going stale. Compute it with `isStale` from
	 * `@resq-systems/ui/adapters`, driven by your own render loop.
	 */
	stale?: boolean;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Ground-vehicle tilt / rollover-margin indicator.
 *
 * @example
 * ```tsx
 * <TiltIndicator roll={12} pitch={-4} rollLimit={28} className="size-64" />
 * ```
 */
function TiltIndicator({
	roll,
	pitch,
	rollLimit,
	pitchLimit,
	stale,
	label,
	className,
	...props
}: Readonly<TiltIndicatorProps>) {
	const rollMax = safePositive(rollLimit, DEFAULT_ROLL_LIMIT);
	const pitchMax = safePositive(pitchLimit, DEFAULT_PITCH_LIMIT);
	const rollDeg = clamp(toFinite(roll), -TILT_DISPLAY_LIMIT, TILT_DISPLAY_LIMIT);
	const pitchDeg = clamp(toFinite(pitch), -TILT_DISPLAY_LIMIT, TILT_DISPLAY_LIMIT);

	const rollFraction = rollDeg / rollMax;
	const pitchFraction = pitchDeg / pitchMax;
	const fraction = Math.hypot(rollFraction, pitchFraction);
	const status = statusColor(fraction);

	// Squash the plotted point back inside the box without distorting its bearing.
	const scale = fraction > MAX_FRACTION ? MAX_FRACTION / fraction : 1;
	const dotX = CENTER + rollFraction * scale * LIMIT_RADIUS;
	const dotY = PLOT_CENTER_Y - pitchFraction * scale * LIMIT_RADIUS;

	const ariaLabel = withStaleness(label ?? formatTiltLabel(rollDeg, pitchDeg, fraction), stale);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="tilt-indicator"
			data-stale={stale === true ? "" : undefined}
			role="img"
		>
			<div
				className={cn(
					"absolute inset-0 overflow-hidden rounded-[6px] border border-border bg-card",
					stale === true && "opacity-45",
				)}
			>
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					{PLOT_GRID}

					{/* Per-axis limit annotations. */}
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={HINT}
						fontSize={7}
						textAnchor="start"
						x={CENTER + LIMIT_RADIUS + 4}
						y={PLOT_CENTER_Y - 7}
					>
						{`${Math.round(rollMax)}°`}
					</text>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={HINT}
						fontSize={7}
						textAnchor="middle"
						x={CENTER + 13}
						y={PLOT_CENTER_Y - LIMIT_RADIUS - 5}
					>
						{`${Math.round(pitchMax)}°`}
					</text>

					{/* Roll / pitch digital readouts, pinned to the free corners. */}
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={12} y={20}>
						ROLL
					</text>
					<text className="font-mono" fill={MARK} fontSize={15} textAnchor="start" x={12} y={36}>
						{formatDegrees(rollDeg)}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={188} y={20}>
						PITCH
					</text>
					<text className="font-mono" fill={MARK} fontSize={15} textAnchor="end" x={188} y={36}>
						{formatDegrees(pitchDeg)}
					</text>

					{/* Envelope usage — the number that matters on a slope. */}
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={status}
						fontSize={11}
						textAnchor="middle"
						x={CENTER}
						y={186}
					>
						{`${Math.round(fraction * PERCENT)}% OF LIMIT`}
					</text>

					{/* Live tilt vector. */}
					<line
						stroke={status}
						strokeLinecap="round"
						strokeOpacity={0.55}
						strokeWidth={2}
						x1={CENTER}
						x2={dotX}
						y1={PLOT_CENTER_Y}
						y2={dotY}
					/>
					<circle cx={dotX} cy={dotY} fill={status} r={DOT_RADIUS} />
					<circle cx={CENTER} cy={PLOT_CENTER_Y} fill={GRID} r={2} />
				</svg>
			</div>
			{stale === true ? (
				<span className="absolute top-1 right-1 rounded-[3px] bg-destructive px-1 py-px font-mono text-[9px] uppercase leading-none text-destructive-foreground">
					Stale
				</span>
			) : null}
		</div>
	);
}

//#endregion

export { TiltIndicator };
