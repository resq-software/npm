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
 * @fileoverview WheelOdometer — a per-wheel drive readout rendered as pure SVG.
 * Each wheel gets a bipolar bar centred on zero (left is reverse, right is
 * forward), with the commanded velocity drawn as a tick so the gap between
 * commanded and measured — i.e. slip — is visible as a coloured overrun rather
 * than as a number the operator has to subtract in their head.
 *
 * Slip is taken from an explicit `slip` ratio when supplied, and otherwise
 * derived as `|velocity − commanded| / maxVelocity`. Wheels at or above
 * `slipWarning` are amber; at or above `slipAlert` they are red.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/wheel-odometer/wheel-odometer
 */

import type * as React from "react";

import { clamp, INSTRUMENT_VIEW, toFinite } from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;

/** Horizontal extent of the bipolar bars and their zero centre. */
const BAR_LEFT = 40;
const BAR_RIGHT = 160;
const BAR_CENTER = (BAR_LEFT + BAR_RIGHT) / 2;
const BAR_HALF = (BAR_RIGHT - BAR_LEFT) / 2;

/** Vertical band the rows are distributed across. */
const ROWS_TOP = 34;
const ROWS_BOTTOM = 170;

/** Row bar thickness bounds, as a share of the available row height. */
const BAR_HEIGHT_RATIO = 0.5;
const BAR_HEIGHT_MIN = 4;
const BAR_HEIGHT_MAX = 16;

/** Rows beyond this are dropped; the count is surfaced in the label. */
const MAX_WHEELS = 8;

/** Fallback full-scale wheel speed in m/s. */
const DEFAULT_MAX_VELOCITY = 2;
/** Default slip ratios at which a wheel turns amber / red. */
const DEFAULT_SLIP_WARNING = 0.2;
const DEFAULT_SLIP_ALERT = 0.5;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const TRACK = "var(--muted)";
const GRID = "var(--border)";
const NOMINAL = "var(--primary)";
const CAUTION = "var(--warning)";
const DANGER = "var(--destructive)";

//#endregion

//#region Types

/** A single wheel / track reading. */
export interface WheelReading {
	/** Short position label, e.g. `"FL"`, `"RR"`, `"L"`. */
	label: string;
	/** Measured velocity in m/s; positive is forward. */
	velocity: number;
	/** Commanded velocity in m/s, when the drive controller reports it. */
	commanded?: number;
	/** Explicit slip ratio in 0–1; derived from `commanded` when omitted. */
	slip?: number;
}

//#endregion

//#region Helpers

/** Positive, finite full-scale velocity or the supplied fallback. */
function safeScale(value: number | undefined, fallback: number): number {
	const resolved = toFinite(value, fallback);
	return resolved > 0 ? resolved : fallback;
}

/** Map a velocity onto the bipolar bar's x axis. */
function velocityToX(velocity: number, max: number): number {
	return BAR_CENTER + (clamp(velocity, -max, max) / max) * BAR_HALF;
}

/** Explicit slip when given, else the commanded-vs-measured gap as a ratio. */
function resolveSlip(wheel: WheelReading, max: number): number {
	if (typeof wheel.slip === "number" && Number.isFinite(wheel.slip)) {
		return clamp(wheel.slip, 0, 1);
	}
	if (typeof wheel.commanded !== "number" || !Number.isFinite(wheel.commanded)) return 0;
	return clamp(Math.abs(toFinite(wheel.velocity) - wheel.commanded) / max, 0, 1);
}

/** Token for a wheel's slip severity. */
function slipColor(slip: number, warning: number, alert: number): string {
	if (slip >= alert) return DANGER;
	if (slip >= warning) return CAUTION;
	return NOMINAL;
}

/** One decimal place, so `1` and `1.04` both read as `1.0`. */
function formatSpeed(value: number): string {
	return value.toFixed(1);
}

/** Build a screen-reader sentence summarising the drive state. */
function formatWheelLabel(
	shown: readonly WheelReading[],
	total: number,
	slips: readonly number[],
	warning: number,
): string {
	if (shown.length === 0) return "Wheel odometer, no wheel data";

	const countPart =
		total > shown.length
			? `showing ${shown.length} of ${total} wheels`
			: `${shown.length} wheel${shown.length === 1 ? "" : "s"}`;

	const mean =
		shown.reduce((sum, wheel) => sum + Math.abs(toFinite(wheel.velocity)), 0) / shown.length;

	const slipping = shown.filter((_wheel, index) => slips[index] >= warning).map((w) => w.label);
	const slipPart =
		slipping.length === 0
			? "no slip detected"
			: `${slipping.length} slipping: ${slipping.join(", ")}`;

	return `Wheel odometer, ${countPart}, mean wheel speed ${formatSpeed(mean)} meters per second, ${slipPart}`;
}

//#endregion

//#region Component

export interface WheelOdometerProps extends React.ComponentProps<"div"> {
	/** Per-wheel readings, in display order. Beyond 8 entries are dropped. */
	wheels?: readonly WheelReading[];
	/** Symmetric full-scale wheel speed in m/s. Defaults to 2. */
	maxVelocity?: number;
	/** Slip ratio at which a wheel turns amber. Defaults to 0.2. */
	slipWarning?: number;
	/** Slip ratio at which a wheel turns red. Defaults to 0.5. */
	slipAlert?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Per-wheel velocity and slip readout for a ground vehicle.
 *
 * @example
 * ```tsx
 * <WheelOdometer
 *   wheels={[
 *     { label: "FL", velocity: 1.2, commanded: 1.2 },
 *     { label: "RL", velocity: 0.3, commanded: 1.2 },
 *   ]}
 *   className="size-64"
 * />
 * ```
 */
function WheelOdometer({
	wheels,
	maxVelocity,
	slipWarning,
	slipAlert,
	label,
	className,
	...props
}: Readonly<WheelOdometerProps>) {
	const max = safeScale(maxVelocity, DEFAULT_MAX_VELOCITY);
	const warning = safeScale(slipWarning, DEFAULT_SLIP_WARNING);
	const alert = safeScale(slipAlert, DEFAULT_SLIP_ALERT);

	const all = wheels ?? [];
	const shown = all.slice(0, MAX_WHEELS);
	const slips = shown.map((wheel) => resolveSlip(wheel, max));

	const rowHeight = shown.length === 0 ? 0 : (ROWS_BOTTOM - ROWS_TOP) / shown.length;
	const barHeight = clamp(rowHeight * BAR_HEIGHT_RATIO, BAR_HEIGHT_MIN, BAR_HEIGHT_MAX);

	const ariaLabel = label ?? formatWheelLabel(shown, all.length, slips, warning);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="wheel-odometer"
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
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={6} y={18}>
						WHEEL SPEED
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={194} y={18}>
						{`±${formatSpeed(max)} m/s`}
					</text>

					{shown.length === 0 ? (
						<text
							className="font-mono"
							dominantBaseline="middle"
							fill={HINT}
							fontSize={11}
							textAnchor="middle"
							x={VIEW / 2}
							y={VIEW / 2}
						>
							NO DRIVE DATA
						</text>
					) : null}

					{shown.map((wheel, index) => {
						const slip = slips[index];
						const color = slipColor(slip, warning, alert);
						const centerY = ROWS_TOP + rowHeight * (index + 0.5);
						const barY = centerY - barHeight / 2;
						const velocity = toFinite(wheel.velocity);
						const valueX = velocityToX(velocity, max);
						const fillLeft = Math.min(BAR_CENTER, valueX);
						const fillWidth = Math.abs(valueX - BAR_CENTER);
						const hasCommanded =
							typeof wheel.commanded === "number" && Number.isFinite(wheel.commanded);

						return (
							<g key={`wheel-${index}-${wheel.label}`}>
								<rect
									fill={TRACK}
									height={barHeight}
									rx={2}
									width={BAR_RIGHT - BAR_LEFT}
									x={BAR_LEFT}
									y={barY}
								/>
								<rect
									fill={color}
									height={barHeight}
									rx={2}
									width={fillWidth}
									x={fillLeft}
									y={barY}
								/>
								{hasCommanded ? (
									<line
										stroke={MARK}
										strokeWidth={1.4}
										x1={velocityToX(wheel.commanded as number, max)}
										x2={velocityToX(wheel.commanded as number, max)}
										y1={barY - 2}
										y2={barY + barHeight + 2}
									/>
								) : null}
								<text
									className="font-mono"
									dominantBaseline="middle"
									fill={color}
									fontSize={10}
									textAnchor="start"
									x={6}
									y={centerY}
								>
									{wheel.label}
								</text>
								<text
									className="font-mono"
									dominantBaseline="middle"
									fill={MARK}
									fontSize={10}
									textAnchor="end"
									x={194}
									y={centerY}
								>
									{formatSpeed(velocity)}
								</text>
							</g>
						);
					})}

					{/* Zero reference, drawn over the bars so it stays readable. */}
					<line
						stroke={GRID}
						strokeWidth={1}
						x1={BAR_CENTER}
						x2={BAR_CENTER}
						y1={ROWS_TOP - 4}
						y2={ROWS_BOTTOM + 4}
					/>

					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={6} y={190}>
						REV
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={194} y={190}>
						FWD
					</text>
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { WheelOdometer };
