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
 * @fileoverview AttitudeIndicator — an artificial-horizon flight instrument
 * rendered as pure SVG. Drive it with `pitch` (degrees, + nose up) and `roll`
 * (degrees, + right bank); it paints a blue-sky / amber-ground split, a pitch
 * ladder, and a rotating bank scale against a fixed aircraft reference symbol.
 *
 * The instrument is presentational and stateless — it has no hooks and no
 * browser-global access, so it renders on the server. All motion is expressed
 * through SVG `transform` **attributes** (not CSS `style`) so it adds zero
 * inline-style writes, and every colour is a design token so it tracks the
 * light / dark theme.
 *
 * Original clean-room implementation: the geometry follows standard primary
 * attitude-indicator display conventions; no third-party instrument source
 * was referenced.
 *
 * @module @resq-systems/ui/components/attitude-indicator/attitude-indicator
 */

import type * as React from "react";

import { cn } from "../../lib/utils.js";

//#region Geometry constants

/** Square SVG user-space edge; the instrument is drawn in a 200×200 box. */
const VIEW = 200;
/** Centre of the instrument in user space. */
const CENTER = VIEW / 2;
/** Vertical travel of the horizon per degree of pitch. */
const PIXELS_PER_DEGREE = 2.5;
/** Pitch is clamped to ±90° for display; beyond that the ladder is meaningless. */
const PITCH_DISPLAY_LIMIT = 90;
/** Degrees in a half / full turn — used to normalise roll into (−180, 180]. */
const HALF_TURN = 180;
const FULL_TURN = 360;

/** Half-width of a major (labelled) pitch-ladder rung. */
const MAJOR_HALF_WIDTH = 22;
/** Half-width of a minor (unlabelled) pitch-ladder rung. */
const MINOR_HALF_WIDTH = 11;
/** Gap between a major rung and its numeric label. */
const LADDER_LABEL_GAP = 5;

/** Outer / inner radii for bank-scale ticks (from the instrument centre). */
const BANK_TICK_OUTER = 96;
const BANK_TICK_INNER = 88;
const BANK_TICK_INNER_LONG = 83;

/** Pitch angles that get a labelled rung, and shorter minor rungs between them. */
const PITCH_MAJORS = [10, 20, 30];
const PITCH_MINORS = [5, 15, 25];
/** Bank angles marked on the roll scale (0 at top, + to the right). */
const BANK_ANGLES = [0, 10, -10, 20, -20, 30, -30, 45, -45, 60, -60];

/** Oversized sky / ground fields so the horizon still covers the disc when tilted. */
const FIELD_X = -CENTER * 3;
const FIELD_W = VIEW * 4;
const FIELD_H = 700;

/** Colour tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--primary-foreground)"; // always-white instrument markings
const SKY = "var(--info)";
const GROUND = "var(--warning)";
const AIRCRAFT_ACCENT = "var(--warning)";

//#endregion

//#region Helpers

/** Coerce a possibly-undefined / non-finite input to a finite number of degrees. */
function toFiniteDegrees(value: number | undefined): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Clamp `value` into the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Wrap a roll angle into the (−180, 180] range so 190° reads as −170°. */
function normalizeRoll(value: number): number {
	return ((((value + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN) - HALF_TURN;
}

/** Build a screen-reader sentence describing the current attitude. */
function formatAttitudeLabel(pitch: number, roll: number): string {
	const p = Math.round(pitch);
	const r = Math.round(roll);
	const pitchPart = p === 0 ? "level" : `${Math.abs(p)} degrees ${p > 0 ? "nose up" : "nose down"}`;
	const rollPart =
		r === 0 ? "wings level" : `${Math.abs(r)} degrees ${r > 0 ? "right" : "left"} bank`;
	return `Attitude indicator, pitch ${pitchPart}, ${rollPart}`;
}

//#endregion

//#region Precomputed static elements

/** Minor pitch-ladder rungs, built once — only the group transform animates. */
const PITCH_MINOR_RUNGS = PITCH_MINORS.flatMap((a) => [a, -a]).map((angle) => {
	const y = CENTER - angle * PIXELS_PER_DEGREE;
	return (
		<line
			key={`minor-${angle}`}
			stroke={MARK}
			strokeLinecap="round"
			strokeOpacity={0.75}
			strokeWidth={1}
			x1={CENTER - MINOR_HALF_WIDTH}
			x2={CENTER + MINOR_HALF_WIDTH}
			y1={y}
			y2={y}
		/>
	);
});

/** Major (labelled) pitch-ladder rungs, built once. */
const PITCH_MAJOR_RUNGS = PITCH_MAJORS.flatMap((a) => [a, -a]).map((angle) => {
	const y = CENTER - angle * PIXELS_PER_DEGREE;
	const text = String(Math.abs(angle));
	return (
		<g key={`major-${angle}`}>
			<line
				stroke={MARK}
				strokeLinecap="round"
				strokeWidth={1.4}
				x1={CENTER - MAJOR_HALF_WIDTH}
				x2={CENTER + MAJOR_HALF_WIDTH}
				y1={y}
				y2={y}
			/>
			<text
				className="font-mono"
				dominantBaseline="middle"
				fill={MARK}
				fontSize={9}
				textAnchor="end"
				x={CENTER - MAJOR_HALF_WIDTH - LADDER_LABEL_GAP}
				y={y}
			>
				{text}
			</text>
			<text
				className="font-mono"
				dominantBaseline="middle"
				fill={MARK}
				fontSize={9}
				textAnchor="start"
				x={CENTER + MAJOR_HALF_WIDTH + LADDER_LABEL_GAP}
				y={y}
			>
				{text}
			</text>
		</g>
	);
});

/** Bank-scale ticks, built once. */
const BANK_SCALE_TICKS = BANK_ANGLES.map((bank) => {
	const rad = (bank * Math.PI) / HALF_TURN;
	const sin = Math.sin(rad);
	const cos = Math.cos(rad);
	const inner =
		bank === 0 || Math.abs(bank) === 30 || Math.abs(bank) === 60
			? BANK_TICK_INNER_LONG
			: BANK_TICK_INNER;
	return (
		<line
			key={`bank-${bank}`}
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={1.2}
			x1={CENTER + BANK_TICK_OUTER * sin}
			x2={CENTER + inner * sin}
			y1={CENTER - BANK_TICK_OUTER * cos}
			y2={CENTER - inner * cos}
		/>
	);
});

/** Fixed reference: sky pointer + miniature aircraft, built once. */
const FIXED_REFERENCE = (
	<g>
		<polygon fill={MARK} points={`${CENTER},13 ${CENTER - 6},25 ${CENTER + 6},25`} />
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={62}
			x2={90}
			y1={CENTER}
			y2={CENTER}
		/>
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={90}
			x2={90}
			y1={CENTER}
			y2={CENTER + 6}
		/>
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={110}
			x2={138}
			y1={CENTER}
			y2={CENTER}
		/>
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={110}
			x2={110}
			y1={CENTER}
			y2={CENTER + 6}
		/>
		<circle cx={CENTER} cy={CENTER} fill={AIRCRAFT_ACCENT} r={3.2} />
	</g>
);

//#endregion

//#region Component

export interface AttitudeIndicatorProps extends React.ComponentProps<"div"> {
	/** Pitch angle in degrees; positive is nose-up. Clamped to ±90° for display. */
	pitch?: number;
	/** Roll / bank angle in degrees; positive is a right bank. Wrapped to (−180, 180]. */
	roll?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Artificial-horizon attitude indicator.
 *
 * @example
 * ```tsx
 * <AttitudeIndicator pitch={8} roll={-15} className="size-64" />
 * ```
 */
function AttitudeIndicator({
	pitch,
	roll,
	label,
	className,
	...props
}: Readonly<AttitudeIndicatorProps>) {
	const pitchDeg = clamp(toFiniteDegrees(pitch), -PITCH_DISPLAY_LIMIT, PITCH_DISPLAY_LIMIT);
	const rollDeg = normalizeRoll(toFiniteDegrees(roll));
	const pitchOffset = pitchDeg * PIXELS_PER_DEGREE;
	const rollTransform = `rotate(${-rollDeg} ${CENTER} ${CENTER})`;
	const ariaLabel = label ?? formatAttitudeLabel(pitchDeg, rollDeg);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="attitude-indicator"
			role="img"
		>
			<div className="absolute inset-0 overflow-hidden rounded-full border border-border">
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					{/* Moving horizon: roll rotates the disc, pitch slides it vertically. */}
					<g transform={rollTransform}>
						<g transform={`translate(0 ${pitchOffset})`}>
							<rect fill={SKY} height={FIELD_H} width={FIELD_W} x={FIELD_X} y={CENTER - FIELD_H} />
							<rect fill={GROUND} height={FIELD_H} width={FIELD_W} x={FIELD_X} y={CENTER} />
							<line
								stroke={MARK}
								strokeWidth={1.6}
								x1={FIELD_X}
								x2={FIELD_X + FIELD_W}
								y1={CENTER}
								y2={CENTER}
							/>
							{PITCH_MINOR_RUNGS}
							{PITCH_MAJOR_RUNGS}
						</g>
					</g>

					{/* Bank scale: rotates with roll but is unaffected by pitch. */}
					<g transform={rollTransform}>{BANK_SCALE_TICKS}</g>

					{/* Fixed reference: sky pointer + miniature aircraft. */}
					{FIXED_REFERENCE}
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { AttitudeIndicator };
