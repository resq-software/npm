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
 * @fileoverview BatteryGauge — a pack-level battery panel rendered as pure SVG.
 * State of charge, bus voltage, pack current and temperature sit above a
 * per-cell balance strip, because on a field vehicle a diverging cell is the
 * failure that strands you, and it is invisible in a single SOC number.
 *
 * Cell bars are drawn as deviation from the pack mean rather than as absolute
 * voltage, so a 30 mV outlier is obvious even when every cell reads "4.1 V".
 * The deviation scale adapts to the observed spread but never shrinks below
 * `cellDeltaWarning`, so a well-balanced pack does not amplify sensor noise
 * into an alarming-looking display.
 *
 * Prop units follow `sensor_msgs/BatteryState` with one deliberate exception:
 * `percentage` is 0–100, not ROS's 0–1, because a 0–1 gauge labelled
 * "percentage" is a persistent source of off-by-100 bugs. Adapters scale.
 * `current` keeps the ROS sign convention — positive charging, negative
 * discharging.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/battery-gauge/battery-gauge
 */

import type * as React from "react";

import { clamp, INSTRUMENT_VIEW, isReading, safePositive } from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;

/** State-of-charge bar. */
const BAR_X = 12;
const BAR_Y = 24;
const BAR_W = 176;
const BAR_H = 28;

/** Cell balance strip. */
const CELLS_TOP = 104;
const CELLS_BOTTOM = 164;
const CELLS_MEAN_Y = (CELLS_TOP + CELLS_BOTTOM) / 2;
const CELLS_HALF_HEIGHT = (CELLS_BOTTOM - CELLS_TOP) / 2;
const CELL_MIN_HEIGHT = 1.5;
const CELL_GAP = 1;

/** Cells beyond this are dropped; the count is surfaced in the label. */
const MAX_CELLS = 24;

/** Defaults for the state-of-charge and cell-balance thresholds. */
const DEFAULT_WARN_PERCENTAGE = 40;
const DEFAULT_ALERT_PERCENTAGE = 15;
const DEFAULT_CELL_DELTA_WARNING = 0.05;
const DEFAULT_CELL_DELTA_ALERT = 0.12;

const FULL_PERCENT = 100;
const MILLIVOLTS_PER_VOLT = 1000;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const TRACK = "var(--muted)";
const GRID = "var(--border)";
const NOMINAL = "var(--success)";
const CAUTION = "var(--warning)";
const DANGER = "var(--destructive)";

//#endregion

//#region Types

/** Derived facts about the cell string. */
interface CellSummary {
	readonly shown: readonly number[];
	readonly total: number;
	readonly mean: number;
	readonly delta: number;
}

//#endregion

//#region Helpers

/** Token for the current state of charge. */
function chargeColor(percentage: number, warn: number, alert: number): string {
	if (percentage <= alert) return DANGER;
	if (percentage <= warn) return CAUTION;
	return NOMINAL;
}

/** Token for a cell's deviation from the pack mean. */
function cellColor(deviation: number, warn: number, alert: number): string {
	const magnitude = Math.abs(deviation);
	if (magnitude >= alert) return DANGER;
	if (magnitude >= warn) return CAUTION;
	return NOMINAL;
}

/** Reduce the cell string to the values needed for display and narration. */
function summarizeCells(cellVoltages: readonly number[] | undefined): CellSummary | null {
	const usable = (cellVoltages ?? []).filter(isReading);
	if (usable.length === 0) return null;

	const shown = usable.slice(0, MAX_CELLS);
	const mean = shown.reduce((sum, volts) => sum + volts, 0) / shown.length;

	return {
		delta: Math.max(...shown) - Math.min(...shown),
		mean,
		shown,
		total: usable.length,
	};
}

/** Build a screen-reader sentence describing the pack. */
function formatBatteryLabel(
	percentage: number | undefined,
	voltage: number | undefined,
	current: number | undefined,
	temperature: number | undefined,
	cells: CellSummary | null,
): string {
	const parts: string[] = [];

	if (isReading(percentage)) {
		parts.push(`${Math.round(clamp(percentage, 0, FULL_PERCENT))} percent`);
	}
	if (isReading(voltage)) {
		parts.push(`${voltage.toFixed(1)} volts`);
	}
	if (isReading(current)) {
		const magnitude = Math.abs(current).toFixed(1);
		if (Math.round(current * 10) === 0) {
			parts.push("no current flow");
		} else {
			parts.push(`${current > 0 ? "charging" : "discharging"} ${magnitude} amps`);
		}
	}
	if (isReading(temperature)) {
		parts.push(`${Math.round(temperature)} degrees Celsius`);
	}
	if (cells !== null) {
		const countPart =
			cells.total > cells.shown.length
				? `showing ${cells.shown.length} of ${cells.total} cells`
				: `${cells.shown.length} cell${cells.shown.length === 1 ? "" : "s"}`;
		parts.push(`${countPart}, ${Math.round(cells.delta * MILLIVOLTS_PER_VOLT)} millivolt spread`);
	}

	return parts.length === 0 ? "Battery, no data" : `Battery, ${parts.join(", ")}`;
}

/** Format an optional reading for the on-instrument readout. */
function readout(value: number | undefined, digits: number, suffix: string): string {
	return isReading(value) ? `${value.toFixed(digits)}${suffix}` : "—";
}

//#endregion

//#region Component

export interface BatteryGaugeProps extends React.ComponentProps<"div"> {
	/** State of charge as 0–100. ROS reports 0–1, so adapters must scale. */
	percentage?: number;
	/** Bus voltage in volts. */
	voltage?: number;
	/** Pack current in amps; positive is charging, negative is discharging. */
	current?: number;
	/** Pack temperature in degrees Celsius. */
	temperature?: number;
	/** Per-cell voltages. Beyond 24 entries are dropped. */
	cellVoltages?: readonly number[];
	/** State of charge at or below which the bar turns amber. Defaults to 40. */
	warnPercentage?: number;
	/** State of charge at or below which the bar turns red. Defaults to 15. */
	alertPercentage?: number;
	/** Cell deviation in volts at which a cell turns amber. Defaults to 0.05. */
	cellDeltaWarning?: number;
	/** Cell deviation in volts at which a cell turns red. Defaults to 0.12. */
	cellDeltaAlert?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Battery pack gauge with state of charge and per-cell balance.
 *
 * @example
 * ```tsx
 * <BatteryGauge
 *   percentage={78}
 *   voltage={24.6}
 *   current={-12.4}
 *   cellVoltages={[4.11, 4.09, 4.12, 4.08]}
 *   className="size-64"
 * />
 * ```
 */
function BatteryGauge({
	percentage,
	voltage,
	current,
	temperature,
	cellVoltages,
	warnPercentage,
	alertPercentage,
	cellDeltaWarning,
	cellDeltaAlert,
	label,
	className,
	...props
}: Readonly<BatteryGaugeProps>) {
	const warn = safePositive(warnPercentage, DEFAULT_WARN_PERCENTAGE);
	const alert = safePositive(alertPercentage, DEFAULT_ALERT_PERCENTAGE);
	const deltaWarn = safePositive(cellDeltaWarning, DEFAULT_CELL_DELTA_WARNING);
	const deltaAlert = safePositive(cellDeltaAlert, DEFAULT_CELL_DELTA_ALERT);

	const charge = isReading(percentage) ? clamp(percentage, 0, FULL_PERCENT) : null;
	const cells = summarizeCells(cellVoltages);
	const ariaLabel = label ?? formatBatteryLabel(percentage, voltage, current, temperature, cells);

	const chargeFill = charge === null ? 0 : (charge / FULL_PERCENT) * BAR_W;
	const chargeToken = charge === null ? TRACK : chargeColor(charge, warn, alert);

	// Adaptive but floored: a balanced pack must not look alarming.
	const deviationScale =
		cells === null
			? deltaWarn
			: Math.max(deltaWarn, ...cells.shown.map((volts) => Math.abs(volts - cells.mean)));
	const cellPitch = cells === null ? 0 : BAR_W / cells.shown.length;
	const cellWidth = Math.max(CELL_MIN_HEIGHT, cellPitch - CELL_GAP);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="battery-gauge"
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
						BATTERY
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={194} y={16}>
						{readout(temperature, 0, "°C")}
					</text>

					{/* State of charge. */}
					<rect fill={TRACK} height={BAR_H} rx={3} width={BAR_W} x={BAR_X} y={BAR_Y} />
					<rect fill={chargeToken} height={BAR_H} rx={3} width={chargeFill} x={BAR_X} y={BAR_Y} />
					<rect
						fill="none"
						height={BAR_H}
						rx={3}
						stroke={GRID}
						strokeWidth={1}
						width={BAR_W}
						x={BAR_X}
						y={BAR_Y}
					/>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={MARK}
						fontSize={16}
						textAnchor="middle"
						x={VIEW / 2}
						y={BAR_Y + BAR_H / 2 + 1}
					>
						{charge === null ? "— %" : `${Math.round(charge)}%`}
					</text>

					{/* Bus readouts. */}
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={12} y={70}>
						VOLTS
					</text>
					<text className="font-mono" fill={MARK} fontSize={15} textAnchor="start" x={12} y={88}>
						{readout(voltage, 1, "")}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={188} y={70}>
						{isReading(current) && current > 0 ? "AMPS IN" : "AMPS OUT"}
					</text>
					<text className="font-mono" fill={MARK} fontSize={15} textAnchor="end" x={188} y={88}>
						{isReading(current) ? Math.abs(current).toFixed(1) : "—"}
					</text>

					{/* Cell balance strip. */}
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={12} y={100}>
						CELL BALANCE
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={188} y={100}>
						{cells === null ? "—" : `Δ ${Math.round(cells.delta * MILLIVOLTS_PER_VOLT)} mV`}
					</text>

					{cells === null ? (
						<text
							className="font-mono"
							dominantBaseline="middle"
							fill={HINT}
							fontSize={10}
							textAnchor="middle"
							x={VIEW / 2}
							y={CELLS_MEAN_Y}
						>
							NO CELL DATA
						</text>
					) : (
						cells.shown.map((volts, index) => {
							const deviation = volts - cells.mean;
							const magnitude = (Math.abs(deviation) / deviationScale) * CELLS_HALF_HEIGHT;
							const height = Math.max(CELL_MIN_HEIGHT, magnitude);
							return (
								<rect
									key={`cell-${index}`}
									fill={cellColor(deviation, deltaWarn, deltaAlert)}
									height={height}
									width={cellWidth}
									x={BAR_X + index * cellPitch}
									y={deviation >= 0 ? CELLS_MEAN_Y - height : CELLS_MEAN_Y}
								/>
							);
						})
					)}

					<line
						stroke={GRID}
						strokeWidth={1}
						x1={BAR_X}
						x2={BAR_X + BAR_W}
						y1={CELLS_MEAN_Y}
						y2={CELLS_MEAN_Y}
					/>

					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={12} y={184}>
						{cells === null ? "" : `${cells.total} CELLS`}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={188} y={184}>
						{cells === null ? "" : `MEAN ${cells.mean.toFixed(2)} V`}
					</text>
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { BatteryGauge };
