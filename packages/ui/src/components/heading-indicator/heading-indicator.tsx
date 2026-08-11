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
 * @fileoverview HeadingIndicator — a directional-gyro / compass-card instrument
 * rendered as pure SVG. Drive it with `heading` (degrees, 0–360, clockwise from
 * north); the compass card rotates so the current heading sits under a fixed
 * lubber line, with a fixed aircraft symbol at the centre.
 *
 * Stateless and hook-free (server-renderable). All motion is expressed through
 * SVG `transform` attributes (zero inline styles) and every color is a design
 * token, so it tracks the light / dark theme.
 *
 * Original clean-room implementation: the geometry follows standard compass-card
 * display conventions; no third-party instrument source was referenced.
 *
 * @module @resq-systems/ui/components/heading-indicator/heading-indicator
 */

import type * as React from "react";

import { withStaleness } from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

/** Square SVG user-space edge; the instrument is drawn in a 200×200 box. */
const VIEW = 200;
/** Centre of the instrument in user space. */
const CENTER = VIEW / 2;
/** Degrees in a full turn. */
const FULL_TURN = 360;
/** Angular spacing between the finest compass ticks. */
const TICK_STEP = 5;

/** Radius of the outer end of every tick. */
const TICK_OUTER = 96;
/** Inner radius per tick class (major = 30°, medium = 10°, minor = 5°). */
const TICK_MAJOR_INNER = 82;
const TICK_MEDIUM_INNER = 87;
const TICK_MINOR_INNER = 91;
/** Radius at which compass numbers / cardinal letters are placed. */
const LABEL_RADIUS = 72;

/** Cardinal letters shown in place of the numeric heading. */
const CARDINALS: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const ACCENT = "var(--warning)";

/** Precomputed compass ticks, one per {@link TICK_STEP} degrees. */
const TICKS = Array.from({ length: FULL_TURN / TICK_STEP }, (_unused, index) => {
	const deg = index * TICK_STEP;
	const major = deg % 30 === 0;
	const medium = !major && deg % 10 === 0;
	return {
		deg,
		inner: major ? TICK_MAJOR_INNER : medium ? TICK_MEDIUM_INNER : TICK_MINOR_INNER,
		width: major ? 1.8 : medium ? 1.2 : 0.8,
	};
});

/** Precomputed compass numbers / cardinal letters, one every 30°. */
const NUMBERS = Array.from({ length: FULL_TURN / 30 }, (_unused, index) => {
	const deg = index * 30;
	return {
		deg,
		size: CARDINALS[deg] ? 12 : 9,
		text: CARDINALS[deg] ?? String(deg / 10),
	};
});

//#endregion

//#region Helpers

/** Coerce a possibly-undefined / non-finite input to a finite number of degrees. */
function toFiniteDegrees(value: number | undefined): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Wrap a heading into the [0, 360) range. */
function normalizeHeading(value: number): number {
	return ((value % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/** Point on the instrument circle at `angleDeg` clockwise from top, at `radius`. */
function polar(angleDeg: number, radius: number): { x: number; y: number } {
	const rad = (angleDeg * Math.PI) / 180;
	return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

//#endregion

//#region Precomputed static elements

/**
 * The compass-card ticks, built once at module load. A heading change only
 * updates the card's rotation transform, so these element references stay stable
 * and React skips reconciling all ~72 of them every render.
 */
const COMPASS_TICKS = TICKS.map(({ deg, inner, width }) => {
	const outer = polar(deg, TICK_OUTER);
	const end = polar(deg, inner);
	return (
		<line
			key={`tick-${deg}`}
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={width}
			x1={outer.x}
			x2={end.x}
			y1={outer.y}
			y2={end.y}
		/>
	);
});

/** The compass numbers / cardinal letters, built once at module load. */
const COMPASS_NUMBERS = NUMBERS.map(({ deg, size, text }) => {
	const point = polar(deg, LABEL_RADIUS);
	return (
		<text
			key={`num-${deg}`}
			className="font-mono"
			dominantBaseline="middle"
			fill={MARK}
			fontSize={size}
			textAnchor="middle"
			transform={`rotate(${deg} ${point.x} ${point.y})`}
			x={point.x}
			y={point.y}
		>
			{text}
		</text>
	);
});

//#endregion

//#region Component

export interface HeadingIndicatorProps extends React.ComponentProps<"div"> {
	/** Heading in degrees, clockwise from north. Wrapped into [0, 360). */
	heading?: number;
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
 * Directional-gyro heading indicator.
 *
 * @example
 * ```tsx
 * <HeadingIndicator heading={135} className="size-64" />
 * ```
 */
function HeadingIndicator({
	heading,
	stale,
	label,
	className,
	...props
}: Readonly<HeadingIndicatorProps>) {
	const headingDeg = normalizeHeading(toFiniteDegrees(heading));
	const ariaLabel = withStaleness(
		label ?? `Heading indicator, ${Math.round(headingDeg) % FULL_TURN} degrees`,
		stale,
	);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="heading-indicator"
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
					{/* Rotating compass card: brings the current heading to the top. */}
					<g transform={`rotate(${-headingDeg} ${CENTER} ${CENTER})`}>
						{COMPASS_TICKS}
						{COMPASS_NUMBERS}
						<polygon
							fill={ACCENT}
							points={`${CENTER},${CENTER - 80} ${CENTER - 4},${CENTER - 90} ${CENTER + 4},${CENTER - 90}`}
						/>
					</g>

					{/* Fixed reference: lubber line + aircraft symbol. */}
					<g>
						<polygon fill={ACCENT} points={`${CENTER - 5},4 ${CENTER + 5},4 ${CENTER},16`} />
						<line
							stroke={MARK}
							strokeLinecap="round"
							strokeWidth={2.2}
							x1={CENTER}
							x2={CENTER}
							y1={86}
							y2={116}
						/>
						<line
							stroke={MARK}
							strokeLinecap="round"
							strokeWidth={2.2}
							x1={86}
							x2={114}
							y1={102}
							y2={102}
						/>
						<line
							stroke={MARK}
							strokeLinecap="round"
							strokeWidth={2.2}
							x1={94}
							x2={106}
							y1={112}
							y2={112}
						/>
					</g>
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

export { HeadingIndicator };
