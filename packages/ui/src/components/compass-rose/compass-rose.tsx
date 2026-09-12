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
 * @fileoverview CompassRose — a north-up marine compass rose rendered as pure
 * SVG. It differs from the aviation heading indicator in the package by design:
 * the card does **not** rotate. A fixed north-up rose lets the hull symbol
 * (heading) and the course-over-ground vector be drawn as two separate arms, so
 * the angle between them — the crab angle produced by set and drift — is
 * visible as a shape rather than as the difference between two numbers.
 *
 * Bearings are degrees true, clockwise from north.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: the layout follows standard marine compass
 * rose conventions; no third-party instrument source was referenced.
 *
 * @module @resq-systems/ui/components/compass-rose/compass-rose
 */

import type * as React from "react";

import {
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	isReading,
	polar,
	withStaleness,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Rose ring radii. */
const TICK_OUTER = 92;
const TICK_MINOR_INNER = 85;
const TICK_MAJOR_INNER = 78;
const CARDINAL_RADIUS = 68;

/** Hull symbol and course vector. */
const HULL_LENGTH = 40;
const HULL_HALF_BEAM = 12;
const HULL_STERN = 16;
const COURSE_MIN = 30;
const COURSE_MAX = 74;
/** Speed in knots at which the course vector reaches its full length. */
const DEFAULT_SPEED_SCALE = 12;

const FULL_TURN = 360;
const HALF_TURN = 180;
/** Degrees of divergence below which heading and course are called aligned. */
const DRIFT_DEADBAND = 0.5;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const HULL = "var(--foreground)";
const COURSE = "var(--info)";
const DRIFT = "var(--warning)";

//#endregion

//#region Helpers

/** Wrap a bearing into [0, 360). */
function normalizeBearing(value: number): number {
	return ((value % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/** Wrap a bearing difference into (−180, 180]. */
function normalizeDelta(value: number): number {
	const wrapped = ((((value + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN) - HALF_TURN;
	// The range is (−180, 180], so an exact half turn is starboard, not port.
	return wrapped === -HALF_TURN ? HALF_TURN : wrapped;
}

/** Three-digit marine bearing, so 7° reads as `007`. */
function formatBearing(value: number): string {
	return String(Math.round(normalizeBearing(value)) % FULL_TURN).padStart(3, "0");
}

/** Build a screen-reader sentence describing the navigational picture. */
function formatRoseLabel(
	heading: number | undefined,
	course: number | undefined,
	speed: number | undefined,
): string {
	if (!isReading(heading) && !isReading(course)) return "Compass rose, no heading data";

	const parts: string[] = [];
	if (isReading(heading)) parts.push(`heading ${formatBearing(heading)} degrees`);
	if (isReading(course)) parts.push(`course over ground ${formatBearing(course)} degrees`);
	if (isReading(speed)) parts.push(`speed over ground ${Math.abs(speed).toFixed(1)} knots`);

	if (isReading(heading) && isReading(course)) {
		const delta = normalizeDelta(course - heading);
		parts.push(
			Math.abs(delta) < DRIFT_DEADBAND
				? "no drift"
				: `${Math.abs(Math.round(delta))} degrees ${delta > 0 ? "starboard" : "port"} drift`,
		);
	}

	return `Compass rose, ${parts.join(", ")}`;
}

//#endregion

//#region Precomputed static elements

/** Ten-degree tick ring; every third tick is a major. */
const ROSE_TICKS = Array.from({ length: FULL_TURN / 10 }, (_unused, index) => {
	const bearing = index * 10;
	const major = bearing % 30 === 0;
	const outer = polar(bearing, TICK_OUTER);
	const inner = polar(bearing, major ? TICK_MAJOR_INNER : TICK_MINOR_INNER);
	return (
		<line
			key={`tick-${bearing}`}
			stroke={GRID}
			strokeLinecap="round"
			strokeWidth={major ? 1.6 : 0.9}
			x1={outer.x}
			x2={inner.x}
			y1={outer.y}
			y2={inner.y}
		/>
	);
});

/** Cardinal and intercardinal letters. */
const ROSE_CARDINALS = [
	{ bearing: 0, text: "N" },
	{ bearing: 45, text: "NE" },
	{ bearing: 90, text: "E" },
	{ bearing: 135, text: "SE" },
	{ bearing: 180, text: "S" },
	{ bearing: 225, text: "SW" },
	{ bearing: 270, text: "W" },
	{ bearing: 315, text: "NW" },
].map(({ bearing, text }) => {
	const point = polar(bearing, CARDINAL_RADIUS);
	const cardinal = bearing % 90 === 0;
	return (
		<text
			key={`cardinal-${bearing}`}
			className="font-mono"
			dominantBaseline="middle"
			fill={cardinal ? MARK : HINT}
			fontSize={cardinal ? 12 : 8}
			textAnchor="middle"
			x={point.x}
			y={point.y}
		>
			{text}
		</text>
	);
});

//#endregion

//#region Component

export interface CompassRoseProps extends React.ComponentProps<"div"> {
	/** Vessel heading in degrees true. */
	heading?: number;
	/** Course over ground in degrees true. */
	course?: number;
	/** Speed over ground in knots; scales the course vector's length. */
	speed?: number;
	/** Speed at which the course vector reaches full length. Defaults to 12. */
	speedScale?: number;
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
 * Marine compass rose showing heading against course over ground.
 *
 * @example
 * ```tsx
 * <CompassRose heading={42} course={48} speed={6.2} className="size-64" />
 * ```
 */
function CompassRose({
	heading,
	course,
	speed,
	speedScale,
	stale,
	label,
	className,
	...props
}: Readonly<CompassRoseProps>) {
	const hasHeading = isReading(heading);
	const hasCourse = isReading(course);
	const headingDeg = hasHeading ? normalizeBearing(heading) : 0;
	const courseDeg = hasCourse ? normalizeBearing(course) : 0;

	const scale = isReading(speedScale) && speedScale > 0 ? speedScale : DEFAULT_SPEED_SCALE;
	const speedFraction = isReading(speed) ? Math.min(1, Math.abs(speed) / scale) : 0.5;
	const courseLength = COURSE_MIN + speedFraction * (COURSE_MAX - COURSE_MIN);
	const courseTip = polar(courseDeg, courseLength);

	const drift = hasHeading && hasCourse ? normalizeDelta(courseDeg - headingDeg) : null;
	const drifting = drift !== null && Math.abs(drift) >= DRIFT_DEADBAND;
	const ariaLabel = withStaleness(label ?? formatRoseLabel(heading, course, speed), stale);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="compass-rose"
			data-stale={stale === true ? "" : undefined}
			role="img"
		>
			<div
				className={cn(
					"absolute inset-0 overflow-hidden rounded-full border border-border bg-card",
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
					{ROSE_TICKS}
					{ROSE_CARDINALS}

					{/* Course-over-ground arm; length tracks speed. */}
					{hasCourse ? (
						<g>
							<line
								stroke={COURSE}
								strokeDasharray="5 3"
								strokeLinecap="round"
								strokeWidth={2.4}
								x1={CENTER}
								x2={courseTip.x}
								y1={CENTER}
								y2={courseTip.y}
							/>
							<circle cx={courseTip.x} cy={courseTip.y} fill={COURSE} r={3.4} />
						</g>
					) : null}

					{/* Hull symbol; points along heading. */}
					{hasHeading ? (
						<polygon
							fill={HULL}
							points={`${CENTER},${CENTER - HULL_LENGTH} ${CENTER + HULL_HALF_BEAM},${CENTER + HULL_STERN} ${CENTER},${CENTER + HULL_STERN - 6} ${CENTER - HULL_HALF_BEAM},${CENTER + HULL_STERN}`}
							transform={`rotate(${headingDeg} ${CENTER} ${CENTER})`}
						/>
					) : null}

					<circle cx={CENTER} cy={CENTER} fill={GRID} r={2.5} />

					{/* Readouts, pinned to the corners the rose leaves free. */}
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={8} y={18}>
						HDG
					</text>
					<text className="font-mono" fill={MARK} fontSize={14} textAnchor="start" x={8} y={33}>
						{hasHeading ? formatBearing(headingDeg) : "—"}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={192} y={18}>
						COG
					</text>
					<text className="font-mono" fill={COURSE} fontSize={14} textAnchor="end" x={192} y={33}>
						{hasCourse ? formatBearing(courseDeg) : "—"}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={8} y={180}>
						SOG
					</text>
					<text className="font-mono" fill={MARK} fontSize={14} textAnchor="start" x={8} y={194}>
						{isReading(speed) ? `${Math.abs(speed).toFixed(1)}` : "—"}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={192} y={180}>
						DRIFT
					</text>
					<text
						className="font-mono"
						fill={drifting ? DRIFT : HINT}
						fontSize={14}
						textAnchor="end"
						x={192}
						y={194}
					>
						{drift === null ? "—" : `${drift > 0 ? "+" : ""}${Math.round(drift)}°`}
					</text>
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

export { CompassRose };
