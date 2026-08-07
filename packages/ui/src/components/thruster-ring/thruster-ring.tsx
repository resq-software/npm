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
 * @fileoverview ThrusterRing — a per-thruster output display for ROVs and USVs,
 * rendered as pure SVG. Each thruster is drawn as a bar at its mounting bearing
 * on the hull, growing outward for forward output and inward for reverse, so the
 * thrust *pattern* is a shape the operator recognises rather than a column of
 * signed numbers.
 *
 * The failure this display exists to catch is saturation: a vehicle holding
 * station against a current can look stable while one thruster sits pinned at
 * 100% with no authority left. Saturated thrusters are called out in the
 * readout and in the accessible label, not just coloured.
 *
 * `angle` is a **mounting bearing** in degrees clockwise from the bow, not a
 * thrust direction. Thrusters without one are distributed evenly around the
 * hull in the order given.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/thruster-ring/thruster-ring
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

/** Radius the bars grow from, and how far they reach at full output. */
const BASE_RADIUS = 46;
const BAR_REACH = 30;
const BAR_WIDTH = 7;
/** Radius of the thruster labels. */
const LABEL_RADIUS = 86;

/** Hull symbol. */
const HULL_RADIUS = 9;
const BOW_TIP = 24;
const BOW_HALF_WIDTH = 6;

/** Thrusters beyond this are dropped; the count is surfaced in the label. */
const MAX_THRUSTERS = 12;
/** Default |output| at which a thruster counts as saturated. */
const DEFAULT_SATURATION = 0.95;
/** |output| at which a thruster turns amber. */
const CAUTION_OUTPUT = 0.75;

const FULL_TURN = 360;
const PERCENT = 100;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const NOMINAL = "var(--success)";
const CAUTION = "var(--warning)";
const DANGER = "var(--destructive)";
const BOW = "var(--warning)";

//#endregion

//#region Types

/** A single thruster's commanded or measured output. */
export interface ThrusterReading {
	/** Short identifier, e.g. `"VR"`, `"HL"`, `"T1"`. */
	label: string;
	/** Normalized output in −1 (full reverse) … +1 (full forward). */
	output: number;
	/** Mounting bearing in degrees clockwise from the bow. Auto-spaced when omitted. */
	angle?: number;
}

//#endregion

//#region Helpers

/** Mounting bearing, falling back to an even distribution around the hull. */
function bearingOf(thruster: ThrusterReading, index: number, count: number): number {
	if (typeof thruster.angle === "number" && Number.isFinite(thruster.angle)) {
		return ((thruster.angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
	}
	return (index * FULL_TURN) / Math.max(1, count);
}

/** Token for a thruster's output magnitude. */
function outputColor(magnitude: number, saturation: number): string {
	if (magnitude >= saturation) return DANGER;
	if (magnitude >= CAUTION_OUTPUT) return CAUTION;
	return NOMINAL;
}

/** Build a screen-reader sentence describing the thrust pattern. */
function formatThrusterLabel(
	shown: readonly ThrusterReading[],
	total: number,
	saturation: number,
): string {
	if (shown.length === 0) return "Thruster ring, no thruster data";

	const countPart =
		total > shown.length
			? `showing ${shown.length} of ${total} thrusters`
			: `${shown.length} thruster${shown.length === 1 ? "" : "s"}`;

	const magnitudes = shown.map((thruster) => Math.abs(clamp(toFinite(thruster.output), -1, 1)));
	const peak = Math.max(...magnitudes);
	const saturated: string[] = [];
	for (let index = 0; index < shown.length; index += 1) {
		if (magnitudes[index] >= saturation) saturated.push(shown[index].label);
	}

	const saturationPart =
		saturated.length === 0
			? "no saturation"
			: `${saturated.length} saturated: ${saturated.join(", ")}`;

	return `Thruster ring, ${countPart}, maximum output ${Math.round(peak * PERCENT)} percent, ${saturationPart}`;
}

//#endregion

//#region Precomputed static elements

/** Hull disc, bow marker and the zero-output ring, built once. */
const HULL_SYMBOL = (
	<g>
		<circle
			cx={CENTER}
			cy={CENTER}
			fill="none"
			r={BASE_RADIUS}
			stroke={GRID}
			strokeDasharray="3 3"
			strokeWidth={1}
		/>
		<circle cx={CENTER} cy={CENTER} fill="none" r={HULL_RADIUS} stroke={GRID} strokeWidth={1.2} />
		<polygon
			fill={BOW}
			points={`${CENTER},${CENTER - BOW_TIP} ${CENTER - BOW_HALF_WIDTH},${CENTER - HULL_RADIUS} ${CENTER + BOW_HALF_WIDTH},${CENTER - HULL_RADIUS}`}
		/>
	</g>
);

//#endregion

//#region Component

export interface ThrusterRingProps extends React.ComponentProps<"div"> {
	/** Per-thruster readings, in mounting order. Beyond 12 entries are dropped. */
	thrusters?: readonly ThrusterReading[];
	/** Absolute output at which a thruster counts as saturated. Defaults to 0.95. */
	saturation?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Radial per-thruster output display with saturation callout.
 *
 * @example
 * ```tsx
 * <ThrusterRing
 *   thrusters={[
 *     { angle: 45, label: "VR", output: -0.82 },
 *     { angle: 315, label: "VL", output: 0.64 },
 *   ]}
 *   className="size-64"
 * />
 * ```
 */
function ThrusterRing({
	thrusters,
	saturation,
	label,
	className,
	...props
}: Readonly<ThrusterRingProps>) {
	const limit = safePositive(saturation, DEFAULT_SATURATION);
	const all = thrusters ?? [];
	const shown = all.slice(0, MAX_THRUSTERS);

	const magnitudes = shown.map((thruster) => Math.abs(clamp(toFinite(thruster.output), -1, 1)));
	const peak = magnitudes.length === 0 ? 0 : Math.max(...magnitudes);
	const saturatedCount = magnitudes.filter((magnitude) => magnitude >= limit).length;
	const ariaLabel = label ?? formatThrusterLabel(shown, all.length, limit);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="thruster-ring"
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
					{HULL_SYMBOL}

					{shown.length === 0 ? (
						<text
							className="font-mono"
							dominantBaseline="middle"
							fill={HINT}
							fontSize={11}
							textAnchor="middle"
							x={CENTER}
							y={CENTER + 34}
						>
							NO THRUSTER DATA
						</text>
					) : null}

					{shown.map((thruster, index) => {
						const output = clamp(toFinite(thruster.output), -1, 1);
						const bearing = bearingOf(thruster, index, shown.length);
						const color = outputColor(Math.abs(output), limit);
						const base = polar(bearing, BASE_RADIUS);
						const tip = polar(bearing, BASE_RADIUS + output * BAR_REACH);
						const text = polar(bearing, LABEL_RADIUS);

						return (
							<g key={`thruster-${index}-${thruster.label}`}>
								<line
									stroke={color}
									strokeLinecap="butt"
									strokeWidth={BAR_WIDTH}
									x1={base.x}
									x2={tip.x}
									y1={base.y}
									y2={tip.y}
								/>
								<text
									className="font-mono"
									dominantBaseline="middle"
									fill={color}
									fontSize={9}
									textAnchor="middle"
									x={text.x}
									y={text.y}
								>
									{thruster.label}
								</text>
							</g>
						);
					})}

					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={6} y={16}>
						THRUST
					</text>
					<text className="font-mono" fill={MARK} fontSize={10} textAnchor="start" x={6} y={192}>
						{shown.length === 0 ? "" : `MAX ${Math.round(peak * PERCENT)}%`}
					</text>
					<text
						className="font-mono"
						fill={saturatedCount > 0 ? DANGER : HINT}
						fontSize={10}
						textAnchor="end"
						x={194}
						y={192}
					>
						{shown.length === 0 ? "" : saturatedCount > 0 ? `${saturatedCount} SAT` : "OK"}
					</text>
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { ThrusterRing };
