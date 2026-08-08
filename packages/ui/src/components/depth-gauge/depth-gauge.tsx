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
 * @fileoverview DepthGauge — a vertical depth tape for ROVs and USVs, rendered
 * as pure SVG. It is a tape rather than a round dial on purpose: depth has a
 * hard zero at the surface and a hard floor at the seabed, and a linear tape
 * shows *where you are between them*, which a wrapping needle cannot.
 *
 * The number that keeps an ROV alive is not depth but **altitude** — clearance
 * above the seabed — so it is computed from `seabed − depth`, given equal
 * billing in the readout, and drives the proximity alarm.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: the layout follows standard depth-sounder
 * presentation conventions; no third-party instrument source was referenced.
 *
 * @module @resq-systems/ui/components/depth-gauge/depth-gauge
 */

import type * as React from "react";

import {
	clamp,
	INSTRUMENT_VIEW,
	isReading,
	linearTicks,
	safePositive,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;

/** The tape itself. */
const TAPE_X = 62;
const TAPE_W = 76;
const TAPE_TOP = 30;
const TAPE_H = 126;
const TAPE_BOTTOM = TAPE_TOP + TAPE_H;

/** Scale ticks and their label column. */
const TICK_DIVISIONS = 5;
const LABEL_X = TAPE_X - 4;

/** Marker sizes. */
const MARKER_HALF = 6;

/** Fallbacks when the corresponding prop is missing or invalid. */
const DEFAULT_MAX_DEPTH = 50;
const DEFAULT_ALTITUDE_WARNING = 2;
/** Headroom added below the seabed when deriving the scale from it. */
const SEABED_HEADROOM = 1.15;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const WATER = "var(--info)";
const SEABED = "var(--warning)";
const TARGET = "var(--success)";
const DANGER = "var(--destructive)";

//#endregion

//#region Helpers

/** Resolve the full-scale depth: explicit, else derived from the seabed. */
function resolveMaxDepth(maxDepth: number | undefined, seabed: number | undefined): number {
	if (isReading(maxDepth) && maxDepth > 0) return maxDepth;
	if (isReading(seabed) && seabed > 0) return seabed * SEABED_HEADROOM;
	return DEFAULT_MAX_DEPTH;
}

/** Map a depth in metres onto the tape's y axis. */
function depthToY(depth: number, max: number): number {
	return TAPE_TOP + (clamp(depth, 0, max) / max) * TAPE_H;
}

/** Format a depth for display, dropping decimals once the numbers get big. */
function formatDepth(value: number): string {
	return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
}

/** Build a screen-reader sentence describing the vertical situation. */
function formatDepthLabel(
	depth: number | undefined,
	seabed: number | undefined,
	target: number | undefined,
	altitudeWarning: number,
): string {
	if (!isReading(depth)) return "Depth gauge, no depth data";

	const parts = [`${formatDepth(depth)} meters`];

	if (isReading(seabed)) {
		const altitude = seabed - depth;
		parts.push(`${formatDepth(altitude)} meters above seabed`);
		if (altitude <= altitudeWarning) parts.push("seabed proximity warning");
	}
	if (isReading(target)) {
		parts.push(`target depth ${formatDepth(target)} meters`);
	}

	return `Depth gauge, ${parts.join(", ")}`;
}

//#endregion

//#region Component

export interface DepthGaugeProps extends React.ComponentProps<"div"> {
	/** Current depth below the surface, in metres. */
	depth?: number;
	/** Total water column depth, in metres. Enables the altitude readout. */
	seabed?: number;
	/** Commanded depth-hold setpoint, in metres. */
	target?: number;
	/** Full-scale depth. Defaults to 15% below `seabed`, else 50. */
	maxDepth?: number;
	/** Altitude at or below which the seabed alarm fires. Defaults to 2. */
	altitudeWarning?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Depth tape with seabed clearance and a depth-hold bug.
 *
 * @example
 * ```tsx
 * <DepthGauge depth={12.4} seabed={16} target={12} className="size-64" />
 * ```
 */
function DepthGauge({
	depth,
	seabed,
	target,
	maxDepth,
	altitudeWarning,
	label,
	className,
	...props
}: Readonly<DepthGaugeProps>) {
	const warning = safePositive(altitudeWarning, DEFAULT_ALTITUDE_WARNING);
	const max = resolveMaxDepth(maxDepth, seabed);
	const hasDepth = isReading(depth);
	const hasSeabed = isReading(seabed);

	const altitude = hasDepth && hasSeabed ? seabed - depth : null;
	const shallow = altitude !== null && altitude <= warning;

	const waterBottom = hasSeabed ? depthToY(seabed, max) : TAPE_BOTTOM;
	const vehicleY = hasDepth ? depthToY(depth, max) : TAPE_TOP;
	const ariaLabel = label ?? formatDepthLabel(depth, seabed, target, warning);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="depth-gauge"
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
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={6} y={16}>
						DEPTH
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={194} y={16}>
						METRES
					</text>

					{/* Water column, then the seabed band below it. */}
					<rect
						fill={WATER}
						fillOpacity={0.18}
						height={waterBottom - TAPE_TOP}
						width={TAPE_W}
						x={TAPE_X}
						y={TAPE_TOP}
					/>
					{hasSeabed ? (
						<rect
							fill={SEABED}
							fillOpacity={0.35}
							height={TAPE_BOTTOM - waterBottom}
							width={TAPE_W}
							x={TAPE_X}
							y={waterBottom}
						/>
					) : null}
					<rect
						fill="none"
						height={TAPE_H}
						stroke={GRID}
						strokeWidth={1}
						width={TAPE_W}
						x={TAPE_X}
						y={TAPE_TOP}
					/>

					{/* Depth scale. */}
					{linearTicks(0, max, TICK_DIVISIONS).map((tickValue) => {
						const y = depthToY(tickValue, max);
						return (
							<g key={`tick-${tickValue}`}>
								<line
									stroke={GRID}
									strokeWidth={1}
									x1={TAPE_X}
									x2={TAPE_X + TAPE_W}
									y1={y}
									y2={y}
								/>
								<text
									className="font-mono"
									dominantBaseline="middle"
									fill={HINT}
									fontSize={8}
									textAnchor="end"
									x={LABEL_X}
									y={y}
								>
									{tickValue.toFixed(0)}
								</text>
							</g>
						);
					})}

					{/* Surface reference. */}
					<line
						stroke={MARK}
						strokeWidth={1.6}
						x1={TAPE_X}
						x2={TAPE_X + TAPE_W}
						y1={TAPE_TOP}
						y2={TAPE_TOP}
					/>

					{/* Depth-hold bug, on the scale side. */}
					{isReading(target) ? (
						<polygon
							fill={TARGET}
							points={`${TAPE_X},${depthToY(target, max)} ${TAPE_X - MARKER_HALF - 2},${depthToY(target, max) - MARKER_HALF} ${TAPE_X - MARKER_HALF - 2},${depthToY(target, max) + MARKER_HALF}`}
						/>
					) : null}

					{/* Vehicle, on the readout side. */}
					{hasDepth ? (
						<g>
							<line
								stroke={shallow ? DANGER : MARK}
								strokeWidth={2}
								x1={TAPE_X}
								x2={TAPE_X + TAPE_W}
								y1={vehicleY}
								y2={vehicleY}
							/>
							<polygon
								fill={shallow ? DANGER : MARK}
								points={`${TAPE_X + TAPE_W},${vehicleY} ${TAPE_X + TAPE_W + MARKER_HALF + 2},${vehicleY - MARKER_HALF} ${TAPE_X + TAPE_W + MARKER_HALF + 2},${vehicleY + MARKER_HALF}`}
							/>
						</g>
					) : null}

					{/* Readouts. */}
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={8} y={176}>
						DEPTH
					</text>
					<text className="font-mono" fill={MARK} fontSize={17} textAnchor="start" x={8} y={193}>
						{hasDepth ? formatDepth(depth) : "—"}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={192} y={176}>
						ALT
					</text>
					<text
						className="font-mono"
						fill={shallow ? DANGER : MARK}
						fontSize={17}
						textAnchor="end"
						x={192}
						y={193}
					>
						{altitude === null ? "—" : formatDepth(altitude)}
					</text>
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { DepthGauge };
