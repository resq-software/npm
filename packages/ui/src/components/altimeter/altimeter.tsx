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
 * @fileoverview Altimeter — a three-pointer-style altitude instrument rendered
 * as pure SVG. Drive it with `altitude` (feet); a long hundreds hand (one turn
 * per 1000 ft) and a short thousands hand (one turn per 10 000 ft) sweep a
 * 0–9 dial, with a digital counter below.
 *
 * Stateless and hook-free (server-renderable). All motion is expressed through
 * SVG attributes (zero inline styles) and every color is a design token, so it
 * tracks the light / dark theme. Geometry comes from the shared
 * {@link module:@resq-systems/ui/lib/instrument-dial} helpers.
 *
 * Original clean-room implementation: the geometry follows standard altimeter
 * display conventions; no third-party instrument source was referenced.
 *
 * @module @resq-systems/ui/components/altimeter/altimeter
 */

import type * as React from "react";

import {
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	polar,
	toFinite,
	valueToAngle,
	withStaleness,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Feet per full revolution of each hand. */
const HUNDREDS_PER_REV = 1000;
const THOUSANDS_PER_REV = 10000;

/** Tick radii and the radius at which the 0–9 numbers sit. */
const TICK_OUTER = 96;
const TICK_MAJOR_INNER = 84;
const TICK_MINOR_INNER = 90;
const LABEL_RADIUS = 70;

/** Hand lengths and hub size. */
const HUNDREDS_HAND = 86;
const THOUSANDS_HAND = 54;
const HUB_RADIUS = 5;

/** 0–9 numbers around the dial; 50 minor ticks (every 20 ft). */
const NUMBERS = Array.from({ length: 10 }, (_unused, index) => index);
const MINOR_TICKS = 50;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HUB = "var(--warning)";

//#endregion

//#region Helpers

/** Non-negative remainder, so negative altitudes still map onto the dial. */
function positiveMod(value: number, modulus: number): number {
	return ((value % modulus) + modulus) % modulus;
}

//#endregion

//#region Precomputed static elements

/**
 * The dial ticks, built once at module load. Only the two hands move as the
 * altitude changes, so these ~50 tick references stay stable and React skips
 * reconciling them every render.
 */
const ALTIMETER_TICKS = Array.from({ length: MINOR_TICKS }, (_unused, index) => {
	const angle = (index / MINOR_TICKS) * 360;
	const major = index % 5 === 0;
	const outer = polar(angle, TICK_OUTER);
	const inner = polar(angle, major ? TICK_MAJOR_INNER : TICK_MINOR_INNER);
	return (
		<line
			key={`tick-${index}`}
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={major ? 1.8 : 0.8}
			x1={outer.x}
			x2={inner.x}
			y1={outer.y}
			y2={inner.y}
		/>
	);
});

/** The 0–9 dial numbers, built once at module load. */
const ALTIMETER_NUMBERS = NUMBERS.map((n) => {
	const point = polar(n * 36, LABEL_RADIUS);
	return (
		<text
			key={`num-${n}`}
			className="font-mono"
			dominantBaseline="middle"
			fill={MARK}
			fontSize={12}
			textAnchor="middle"
			x={point.x}
			y={point.y}
		>
			{n}
		</text>
	);
});

//#endregion

//#region Component

export interface AltimeterProps extends React.ComponentProps<"div"> {
	/** Altitude in feet. */
	altitude?: number;
	/** Unit shown under the digital counter. Defaults to `"ft"`. */
	unit?: string;
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
 * Two-hand sensitive altimeter.
 *
 * @example
 * ```tsx
 * <Altimeter altitude={4250} className="size-64" />
 * ```
 */
function Altimeter({
	altitude,
	unit = "ft",
	stale,
	label,
	className,
	...props
}: Readonly<AltimeterProps>) {
	const feet = toFinite(altitude);
	const ariaLabel = withStaleness(
		label ?? `Altimeter, ${Math.round(feet)} ${unit === "ft" ? "feet" : unit}`,
		stale,
	);

	const hundredsAngle = valueToAngle(
		positiveMod(feet, HUNDREDS_PER_REV),
		0,
		HUNDREDS_PER_REV,
		0,
		360,
	);
	const thousandsAngle = valueToAngle(
		positiveMod(feet, THOUSANDS_PER_REV),
		0,
		THOUSANDS_PER_REV,
		0,
		360,
	);
	const hundredsTip = polar(hundredsAngle, HUNDREDS_HAND);
	const hundredsTail = polar(hundredsAngle + 180, 14);
	const thousandsTip = polar(thousandsAngle, THOUSANDS_HAND);
	const thousandsTail = polar(thousandsAngle + 180, 12);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="altimeter"
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
					{/* Ticks: 50 minor (every 20 ft), major every 100 ft. */}
					{ALTIMETER_TICKS}

					{/* 0–9 numbers. */}
					{ALTIMETER_NUMBERS}

					{/* Digital counter. */}
					<rect
						fill="var(--background)"
						height={17}
						rx={3}
						stroke="var(--border)"
						width={46}
						x={CENTER - 23}
						y={CENTER + 30}
					/>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={MARK}
						fontSize={12}
						textAnchor="middle"
						x={CENTER}
						y={CENTER + 39}
					>
						{Math.round(feet)}
					</text>

					{/* Thousands hand (short, wide), then hundreds hand (long, thin). */}
					<line
						stroke={MARK}
						strokeLinecap="round"
						strokeWidth={5}
						x1={thousandsTail.x}
						x2={thousandsTip.x}
						y1={thousandsTail.y}
						y2={thousandsTip.y}
					/>
					<line
						stroke={MARK}
						strokeLinecap="round"
						strokeWidth={2.4}
						x1={hundredsTail.x}
						x2={hundredsTip.x}
						y1={hundredsTail.y}
						y2={hundredsTip.y}
					/>
					<circle cx={CENTER} cy={CENTER} fill={HUB} r={HUB_RADIUS} />
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

export { Altimeter };
