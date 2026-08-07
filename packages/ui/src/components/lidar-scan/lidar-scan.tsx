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
 * @fileoverview LidarScan — a planar laser-scan plot rendered as pure SVG. The
 * props mirror `sensor_msgs/LaserScan` field-for-field (`ranges`, `angleMin`,
 * `angleIncrement`, `rangeMin`, `rangeMax`) but as plain numbers, so the
 * component never imports a ROS client.
 *
 * Angles follow REP-103: radians, counter-clockwise positive, zero straight
 * ahead. On screen, straight ahead is up.
 *
 * The whole scan is drawn as **two `<path>` elements** — a free-space polygon
 * and an obstacle outline — rather than one node per beam, so a 1080-beam scan
 * costs the same number of React elements as an 8-beam one. Beams are
 * downsampled into at most {@link MAX_POINTS} buckets, taking the *minimum*
 * range in each bucket so downsampling can never hide a close obstacle.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/lidar-scan/lidar-scan
 */

import type * as React from "react";

import {
	clamp,
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	polar,
	safePositive,
	toFinite,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Screen radius of the outermost range ring. */
const PLOT_RADIUS = 74;
/** Range rings drawn as fractions of `rangeMax`. */
const RING_FRACTIONS = [1 / 3, 2 / 3, 1];
/** Beams are bucketed down to at most this many plotted points. */
const MAX_POINTS = 360;

/** Vehicle marker half-dimensions. */
const VEHICLE_HALF_WIDTH = 4;
const VEHICLE_NOSE = 7;

/** Fallbacks when the corresponding prop is missing or invalid. */
const DEFAULT_RANGE_MAX = 10;
const DEFAULT_WARN_RANGE = 1;
const DEFAULT_ANGLE_MIN = -Math.PI;

const FULL_TURN = 360;
const RAD_TO_DEG = 180 / Math.PI;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const FREE_SPACE = "var(--info)";
const OBSTACLE = "var(--foreground)";
const DANGER = "var(--destructive)";
const VEHICLE = "var(--warning)";

//#endregion

//#region Types

/** A single downsampled beam ready for plotting. */
interface Beam {
	/** Beam angle in radians (REP-103: CCW positive, 0 straight ahead). */
	readonly angle: number;
	/** Range in metres, already clamped to `rangeMax`. */
	readonly range: number;
	/** Whether this bucket contained a real return. */
	readonly hit: boolean;
}

/** Aggregate facts about the raw scan, computed before downsampling. */
interface ScanSummary {
	readonly total: number;
	readonly returns: number;
	readonly nearestRange: number;
	readonly nearestAngle: number;
}

//#endregion

//#region Helpers

/** Whether a raw range counts as a real return for this scan configuration. */
function isReturn(range: number, rangeMin: number, rangeMax: number): boolean {
	return Number.isFinite(range) && range >= rangeMin && range <= rangeMax;
}

/** Screen point for a beam; no-return beams sit on the outer ring. */
function beamPoint(angle: number, range: number, rangeMax: number) {
	const bearingDeg = -angle * RAD_TO_DEG;
	return polar(bearingDeg, (clamp(range, 0, rangeMax) / rangeMax) * PLOT_RADIUS);
}

/** Relative bearing in whole degrees, clockwise from straight ahead. */
function relativeBearing(angle: number): number {
	return ((Math.round(-angle * RAD_TO_DEG) % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/**
 * Walk the raw ranges once, collecting counts and the closest return. Reading
 * the raw array (rather than the downsampled beams) keeps the reported nearest
 * obstacle exact.
 */
function summarize(
	ranges: ArrayLike<number>,
	angleMin: number,
	increment: number,
	rangeMin: number,
	rangeMax: number,
): ScanSummary {
	let returns = 0;
	let nearestRange = Number.POSITIVE_INFINITY;
	let nearestAngle = 0;

	for (let index = 0; index < ranges.length; index += 1) {
		const range = ranges[index];
		if (!isReturn(range, rangeMin, rangeMax)) continue;
		returns += 1;
		if (range < nearestRange) {
			nearestRange = range;
			nearestAngle = angleMin + index * increment;
		}
	}

	return { nearestAngle, nearestRange, returns, total: ranges.length };
}

/**
 * Bucket the raw beams down to at most {@link MAX_POINTS} plotted points,
 * keeping the minimum range per bucket so a narrow obstacle survives
 * downsampling.
 */
function downsample(
	ranges: ArrayLike<number>,
	angleMin: number,
	increment: number,
	rangeMin: number,
	rangeMax: number,
): Beam[] {
	const count = ranges.length;
	const stride = Math.max(1, Math.ceil(count / MAX_POINTS));
	const beams: Beam[] = [];

	for (let start = 0; start < count; start += stride) {
		const end = Math.min(count, start + stride);
		let best = Number.POSITIVE_INFINITY;

		let bestIndex = -1;
		for (let index = start; index < end; index += 1) {
			const range = ranges[index];
			if (isReturn(range, rangeMin, rangeMax) && range < best) {
				best = range;
				bestIndex = index;
			}
		}

		const hit = bestIndex !== -1;
		// A hit is drawn at the bearing of the beam that actually saw it. Using the
		// bucket midpoint would misplace a close obstacle by up to half a stride —
		// an error that grows with scan density, exactly when it matters most.
		const beamIndex = hit ? bestIndex : start + (end - start - 1) / 2;
		beams.push({
			angle: angleMin + beamIndex * increment,
			hit,
			range: hit ? best : rangeMax,
		});
	}

	return beams;
}

/** Closed polygon path covering the swept free space. */
function freeSpacePath(beams: readonly Beam[], rangeMax: number): string {
	if (beams.length === 0) return "";
	const points = beams.map((beam) => {
		const point = beamPoint(beam.angle, beam.range, rangeMax);
		return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
	});
	return `M ${CENTER} ${CENTER} L ${points.join(" L ")} Z`;
}

/**
 * Path of the obstacle outline, broken into runs so beams with no return do
 * not get connected across the gap.
 */
function obstaclePath(
	beams: readonly Beam[],
	rangeMax: number,
	predicate: (beam: Beam) => boolean,
): string {
	const parts: string[] = [];
	let open = false;

	for (const beam of beams) {
		if (!predicate(beam)) {
			open = false;
			continue;
		}
		const point = beamPoint(beam.angle, beam.range, rangeMax);
		parts.push(`${open ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
		open = true;
	}

	return parts.join(" ");
}

/** Build a screen-reader sentence describing the scan. */
function formatScanLabel(summary: ScanSummary, warnRange: number): string {
	if (summary.total === 0) return "Lidar scan, no scan data";
	if (summary.returns === 0) return `Lidar scan, no returns from ${summary.total} beams`;

	const bearing = relativeBearing(summary.nearestAngle);
	const proximity = summary.nearestRange <= warnRange ? ", obstacle warning" : "";
	return `Lidar scan, ${summary.returns} of ${summary.total} beams returning, nearest obstacle ${summary.nearestRange.toFixed(1)} meters at ${bearing} degrees${proximity}`;
}

//#endregion

//#region Precomputed static elements

/** Range rings and the fore/aft, port/starboard crosshair, built once. */
const PLOT_GRID = (
	<g>
		{RING_FRACTIONS.map((fraction) => (
			<circle
				key={`ring-${fraction}`}
				cx={CENTER}
				cy={CENTER}
				fill="none"
				r={PLOT_RADIUS * fraction}
				stroke={GRID}
				strokeWidth={1}
			/>
		))}
		<line
			stroke={GRID}
			strokeOpacity={0.6}
			strokeWidth={1}
			x1={CENTER - PLOT_RADIUS}
			x2={CENTER + PLOT_RADIUS}
			y1={CENTER}
			y2={CENTER}
		/>
		<line
			stroke={GRID}
			strokeOpacity={0.6}
			strokeWidth={1}
			x1={CENTER}
			x2={CENTER}
			y1={CENTER - PLOT_RADIUS}
			y2={CENTER + PLOT_RADIUS}
		/>
	</g>
);

/** Vehicle reference triangle pointing up (straight ahead), built once. */
const VEHICLE_MARKER = (
	<polygon
		fill={VEHICLE}
		points={`${CENTER},${CENTER - VEHICLE_NOSE} ${CENTER - VEHICLE_HALF_WIDTH},${CENTER + VEHICLE_HALF_WIDTH} ${CENTER + VEHICLE_HALF_WIDTH},${CENTER + VEHICLE_HALF_WIDTH}`}
	/>
);

//#endregion

//#region Component

export interface LidarScanProps extends React.ComponentProps<"div"> {
	/** Beam ranges in metres, in beam order. Accepts a typed array. */
	ranges?: ArrayLike<number>;
	/** Angle of the first beam in radians. Defaults to −π. */
	angleMin?: number;
	/** Angle step between beams in radians. Defaults to a full turn / beam count. */
	angleIncrement?: number;
	/** Ranges below this are discarded as invalid. Defaults to 0. */
	rangeMin?: number;
	/** Full-scale range in metres; ranges above it are treated as no return. Defaults to 10. */
	rangeMax?: number;
	/** Returns at or inside this range are drawn as a hazard. Defaults to 1. */
	warnRange?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Planar lidar / laser-scan plot with obstacle proximity highlighting.
 *
 * @example
 * ```tsx
 * <LidarScan ranges={scan.ranges} angleMin={scan.angle_min} rangeMax={12} className="size-64" />
 * ```
 */
function LidarScan({
	ranges,
	angleMin,
	angleIncrement,
	rangeMin,
	rangeMax,
	warnRange,
	label,
	className,
	...props
}: Readonly<LidarScanProps>) {
	const beamsIn = ranges ?? [];
	const max = safePositive(rangeMax, DEFAULT_RANGE_MAX);
	const min = Math.max(0, toFinite(rangeMin, 0));
	const warn = safePositive(warnRange, DEFAULT_WARN_RANGE);
	const start = toFinite(angleMin, DEFAULT_ANGLE_MIN);
	const increment =
		toFinite(angleIncrement, 0) !== 0
			? toFinite(angleIncrement, 0)
			: (2 * Math.PI) / Math.max(1, beamsIn.length);

	const summary = summarize(beamsIn, start, increment, min, max);
	const beams = downsample(beamsIn, start, increment, min, max);
	const nearestHazard = summary.returns > 0 && summary.nearestRange <= warn;

	const ariaLabel = label ?? formatScanLabel(summary, warn);
	const nearestPoint = beamPoint(summary.nearestAngle, summary.nearestRange, max);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="lidar-scan"
			role="img"
		>
			<div className="absolute inset-0 overflow-hidden rounded-[6px] border border-border bg-card">
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					{/* Swept free space — one path for the whole scan. */}
					<path d={freeSpacePath(beams, max)} fill={FREE_SPACE} fillOpacity={0.14} stroke="none" />

					{PLOT_GRID}

					{/* Obstacle outline, then the close-range subset over the top. */}
					<path
						d={obstaclePath(beams, max, (beam) => beam.hit)}
						fill="none"
						stroke={OBSTACLE}
						strokeLinecap="round"
						strokeWidth={1.6}
					/>
					<path
						d={obstaclePath(beams, max, (beam) => beam.hit && beam.range <= warn)}
						fill="none"
						stroke={DANGER}
						strokeLinecap="round"
						strokeWidth={3}
					/>

					{VEHICLE_MARKER}

					{/* Nearest-return callout. */}
					{summary.returns > 0 ? (
						<circle
							cx={nearestPoint.x}
							cy={nearestPoint.y}
							fill="none"
							r={5}
							stroke={nearestHazard ? DANGER : MARK}
							strokeWidth={1.4}
						/>
					) : null}

					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={6} y={16}>
						LIDAR
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={194} y={16}>
						{`${max.toFixed(0)} m`}
					</text>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={nearestHazard ? DANGER : MARK}
						fontSize={11}
						textAnchor="middle"
						x={CENTER}
						y={190}
					>
						{summary.returns === 0
							? "NO RETURNS"
							: `${summary.nearestRange.toFixed(1)} m @ ${String(relativeBearing(summary.nearestAngle)).padStart(3, "0")}°`}
					</text>
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { LidarScan };
