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
 * @fileoverview VerticalSpeedIndicator — a climb / descent rate gauge rendered
 * as pure SVG. Drive it with `verticalSpeed` (feet per minute) against a
 * symmetric `maxRate`; the needle rests at 9 o'clock for level flight, sweeps
 * up-and-over the top for climb and down-and-under the bottom for descent.
 *
 * Stateless and hook-free (server-renderable). All motion is expressed through
 * SVG attributes (zero inline styles) and every colour is a design token, so it
 * tracks the light / dark theme. Geometry comes from the shared
 * {@link module:@resq-systems/ui/lib/instrument-dial} helpers.
 *
 * Original clean-room implementation: the geometry follows standard VSI display
 * conventions; no third-party instrument source was referenced.
 *
 * @module @resq-systems/ui/components/vertical-speed-indicator/vertical-speed-indicator
 */

import type * as React from "react";

import {
	clamp,
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	linearTicks,
	polar,
	toFinite,
	valueToAngle,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Zero rests at 9 o'clock; the scale spans ±HALF_SWEEP either side. */
const ZERO_ANGLE = 270;
const HALF_SWEEP = 160;
/** Fallback full-scale rate when `maxRate` is missing or invalid. */
const DEFAULT_MAX_RATE = 2000;
/** Minor divisions across the whole (bipolar) scale; majors on even indices. */
const DIVISIONS = 8;

/** Tick radii and the radius at which numeric labels sit. */
const TICK_OUTER = 96;
const TICK_MAJOR_INNER = 83;
const TICK_MINOR_INNER = 90;
const LABEL_RADIUS = 70;

/** Needle geometry. */
const NEEDLE_TIP = 86;
const NEEDLE_TAIL = 16;
const HUB_RADIUS = 4.5;

/** Colour tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HUB = "var(--warning)";

//#endregion

//#region Helpers

/** Map a vertical-speed value to its needle angle (clockwise from top). */
function rateToAngle(rate: number, max: number): number {
	return valueToAngle(rate, -max, max, ZERO_ANGLE - HALF_SWEEP, 2 * HALF_SWEEP);
}

/** Format a thousands label without a trailing `.0`. */
function thousandsLabel(value: number): string {
	const thousands = Math.abs(value) / 1000;
	return Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1);
}

//#endregion

//#region Precomputed dial face

/**
 * The ticks + labels depend only on the full-scale `max`, not the live rate.
 * Cache the built face by `max` so moving the needle reuses the elements
 * instead of re-creating them every render.
 */
const DIAL_FACE_CACHE = new Map<number, React.ReactNode>();

function dialFace(max: number): React.ReactNode {
	const cached = DIAL_FACE_CACHE.get(max);
	if (cached !== undefined) return cached;
	const ticks = linearTicks(-max, max, DIVISIONS);
	const face = (
		<>
			{ticks.map((tickValue, index) => {
				const major = index % 2 === 0;
				const angle = rateToAngle(tickValue, max);
				const outer = polar(angle, TICK_OUTER);
				const inner = polar(angle, major ? TICK_MAJOR_INNER : TICK_MINOR_INNER);
				return (
					<line
						key={`tick-${index}`}
						stroke={MARK}
						strokeLinecap="round"
						strokeWidth={major ? 1.8 : 0.9}
						x1={outer.x}
						x2={inner.x}
						y1={outer.y}
						y2={inner.y}
					/>
				);
			})}
			{ticks.flatMap((tickValue, index) => {
				if (index % 2 !== 0) return [];
				const point = polar(rateToAngle(tickValue, max), LABEL_RADIUS);
				return [
					<text
						key={`label-${index}`}
						className="font-mono"
						dominantBaseline="middle"
						fill={MARK}
						fontSize={11}
						textAnchor="middle"
						x={point.x}
						y={point.y}
					>
						{thousandsLabel(tickValue)}
					</text>,
				];
			})}
		</>
	);
	DIAL_FACE_CACHE.set(max, face);
	return face;
}

//#endregion

//#region Component

export interface VerticalSpeedIndicatorProps extends React.ComponentProps<"div"> {
	/** Vertical speed in feet per minute; positive is a climb. Clamped to `±maxRate`. */
	verticalSpeed?: number;
	/** Symmetric full-scale rate. Defaults to 2000. */
	maxRate?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Vertical speed indicator (climb / descent rate).
 *
 * @example
 * ```tsx
 * <VerticalSpeedIndicator verticalSpeed={750} className="size-64" />
 * ```
 */
function VerticalSpeedIndicator({
	verticalSpeed,
	maxRate,
	label,
	className,
	...props
}: Readonly<VerticalSpeedIndicatorProps>) {
	const max =
		toFinite(maxRate, DEFAULT_MAX_RATE) > 0
			? toFinite(maxRate, DEFAULT_MAX_RATE)
			: DEFAULT_MAX_RATE;
	const rate = clamp(toFinite(verticalSpeed), -max, max);
	const rounded = Math.round(rate);
	const ariaLabel =
		label ??
		(rounded === 0
			? "Vertical speed indicator, level"
			: `Vertical speed indicator, ${Math.abs(rounded)} feet per minute ${rounded > 0 ? "climb" : "descent"}`);

	const needleAngle = rateToAngle(rate, max);
	const tip = polar(needleAngle, NEEDLE_TIP);
	const tail = polar(needleAngle + 180, NEEDLE_TAIL);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="vertical-speed-indicator"
			role="img"
		>
			<div className="absolute inset-0 overflow-hidden rounded-full border border-border bg-card">
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					{/* Dial face — ticks + labels, cached on maxRate. */}
					{dialFace(max)}

					{/* Climb / descent hints. */}
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill="var(--hint)"
						fontSize={7}
						textAnchor="middle"
						x={polar(330, 46).x}
						y={polar(330, 46).y}
					>
						UP
					</text>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill="var(--hint)"
						fontSize={7}
						textAnchor="middle"
						x={polar(210, 46).x}
						y={polar(210, 46).y}
					>
						DN
					</text>

					{/* Digital readout. */}
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={MARK}
						fontSize={13}
						textAnchor="middle"
						x={CENTER}
						y={CENTER + 42}
					>
						{`${rounded > 0 ? "+" : ""}${rounded}`}
					</text>

					{/* Needle. */}
					<line
						stroke={MARK}
						strokeLinecap="round"
						strokeWidth={2.6}
						x1={tail.x}
						x2={tip.x}
						y1={tail.y}
						y2={tip.y}
					/>
					<circle cx={CENTER} cy={CENTER} fill={HUB} r={HUB_RADIUS} />
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { VerticalSpeedIndicator };
