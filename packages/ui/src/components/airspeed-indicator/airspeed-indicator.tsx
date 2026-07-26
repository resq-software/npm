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
 * @fileoverview AirspeedIndicator — a round pointer gauge rendered as pure SVG.
 * Drive it with `speed` against a `maxSpeed` range; a needle sweeps a 300° arc
 * (zero at the lower-left, maximum at the lower-right) over an optional set of
 * coloured operating `bands` and a `redline`, with a digital readout below.
 *
 * Although modelled on an airspeed indicator, the `bands` / `unit` / `maxSpeed`
 * props make it a general-purpose telemetry dial (speed, RPM, pressure, …).
 *
 * Stateless and hook-free (server-renderable). All motion is expressed through
 * SVG `transform` / path attributes (zero inline styles) and every colour is a
 * design token, so it tracks the light / dark theme.
 *
 * Original clean-room implementation: the geometry follows standard round-dial
 * gauge conventions; no third-party instrument source was referenced.
 *
 * @module @resq-systems/ui/components/airspeed-indicator/airspeed-indicator
 */

import type * as React from "react";

import {
	clamp,
	describeArc,
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	polar,
	toFinite,
	valueToAngle,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

/** Square SVG user-space edge and centre (shared instrument geometry). */
const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;
/** Scale start angle (clockwise from top) and total sweep — leaves a 60° gap at the bottom. */
const START_ANGLE = 210;
const SWEEP = 300;

/** Tick radii and the radius at which numeric labels sit. */
const TICK_OUTER = 96;
const TICK_MAJOR_INNER = 84;
const TICK_MINOR_INNER = 89;
const LABEL_RADIUS = 71;
/** Radius of the coloured operating-range arcs. */
const BAND_RADIUS = 90;

/** Needle geometry. */
const NEEDLE_TIP = 80;
const NEEDLE_TAIL = 18;
const HUB_RADIUS = 4.5;

/** Number of minor divisions across the scale (majors fall on even indices). */
const MINOR_DIVISIONS = 20;
/** Fallback range when `maxSpeed` is missing or invalid. */
const DEFAULT_MAX = 200;

/** Colour tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HUB = "var(--warning)";
const TONE: Record<SpeedBandTone, string> = {
	caution: "var(--warning)",
	danger: "var(--destructive)",
	normal: "var(--success)",
};

//#endregion

//#region Helpers

/** Map a scale value to its needle angle (clockwise from top). */
function angleForValue(value: number, max: number): number {
	return valueToAngle(value, 0, max, START_ANGLE, SWEEP);
}

//#endregion

//#region Precomputed dial face

/**
 * The ticks + numeric labels depend only on the full-scale `max`, not the live
 * `speed`. Cache the built face by `max` so dragging the needle reuses ~32
 * elements instead of re-creating them every render.
 */
const DIAL_FACE_CACHE = new Map<number, React.ReactNode>();

function dialFace(max: number): React.ReactNode {
	const cached = DIAL_FACE_CACHE.get(max);
	if (cached !== undefined) return cached;
	const ticks = Array.from({ length: MINOR_DIVISIONS + 1 }, (_unused, index) => ({
		index,
		value: (index / MINOR_DIVISIONS) * max,
	}));
	const face = (
		<>
			{ticks.map(({ index, value: tickValue }) => {
				const major = index % 2 === 0;
				const angle = angleForValue(tickValue, max);
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
			{ticks.flatMap(({ index, value: tickValue }) => {
				if (index % 2 !== 0) return [];
				const point = polar(angleForValue(tickValue, max), LABEL_RADIUS);
				return [
					<text
						key={`label-${index}`}
						className="font-mono"
						dominantBaseline="middle"
						fill={MARK}
						fontSize={9}
						textAnchor="middle"
						x={point.x}
						y={point.y}
					>
						{Math.round(tickValue)}
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

export type SpeedBandTone = "normal" | "caution" | "danger";

export interface SpeedBand {
	/** Range start, in scale units. */
	from: number;
	/** Range end, in scale units. */
	to: number;
	/** Semantic tone → green / amber / red arc. */
	tone: SpeedBandTone;
}

export interface AirspeedIndicatorProps extends React.ComponentProps<"div"> {
	/** Current speed, in scale units. Clamped to `[0, maxSpeed]`. */
	speed?: number;
	/** Full-scale value. Defaults to 200. */
	maxSpeed?: number;
	/** Unit shown under the digital readout. Defaults to `"kt"`. */
	unit?: string;
	/** Coloured operating-range arcs. */
	bands?: SpeedBand[];
	/** Never-exceed marker, in scale units. */
	redline?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Round pointer gauge (airspeed / generic telemetry dial).
 *
 * @example
 * ```tsx
 * <AirspeedIndicator
 *   speed={120}
 *   maxSpeed={200}
 *   bands={[{ from: 40, to: 140, tone: "normal" }, { from: 140, to: 180, tone: "caution" }]}
 *   redline={180}
 * />
 * ```
 */
function AirspeedIndicator({
	speed,
	maxSpeed,
	unit = "kt",
	bands,
	redline,
	label,
	className,
	...props
}: Readonly<AirspeedIndicatorProps>) {
	const max = toFinite(maxSpeed, DEFAULT_MAX) > 0 ? toFinite(maxSpeed, DEFAULT_MAX) : DEFAULT_MAX;
	const value = clamp(toFinite(speed), 0, max);
	const ariaLabel = label ?? `Airspeed indicator, ${Math.round(value)} ${unit}`;

	const validBands = (bands ?? []).filter((band) => band.to > band.from);
	const redlineValue = redline == null ? null : clamp(toFinite(redline), 0, max);

	const needleAngle = angleForValue(value, max);
	const tip = polar(needleAngle, NEEDLE_TIP);
	const tail = polar(needleAngle + 180, NEEDLE_TAIL);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="airspeed-indicator"
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
					{/* Coloured operating-range arcs. */}
					{validBands.map((band) => (
						<path
							key={`band-${band.tone}-${band.from}-${band.to}`}
							d={describeArc(
								BAND_RADIUS,
								angleForValue(band.from, max),
								angleForValue(band.to, max),
							)}
							fill="none"
							stroke={TONE[band.tone]}
							strokeWidth={6}
						/>
					))}

					{/* Dial face — ticks + labels, cached on maxSpeed. */}
					{dialFace(max)}

					{/* Redline marker. */}
					{redlineValue != null ? (
						<line
							stroke={TONE.danger}
							strokeLinecap="round"
							strokeWidth={2.5}
							x1={polar(angleForValue(redlineValue, max), TICK_OUTER).x}
							x2={polar(angleForValue(redlineValue, max), TICK_MAJOR_INNER - 2).x}
							y1={polar(angleForValue(redlineValue, max), TICK_OUTER).y}
							y2={polar(angleForValue(redlineValue, max), TICK_MAJOR_INNER - 2).y}
						/>
					) : null}

					{/* Digital readout. */}
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={MARK}
						fontSize={16}
						textAnchor="middle"
						x={CENTER}
						y={CENTER + 44}
					>
						{Math.round(value)}
					</text>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill="var(--hint)"
						fontSize={7}
						letterSpacing={1}
						textAnchor="middle"
						x={CENTER}
						y={CENTER + 58}
					>
						{unit.toUpperCase()}
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

export { AirspeedIndicator };
