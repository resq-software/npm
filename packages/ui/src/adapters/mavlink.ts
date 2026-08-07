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
 * @fileoverview MAVLink message → instrument prop mappers, for ArduPilot and
 * ArduSub vehicles.
 *
 * MAVLink is dense with scaled integers and sentinel values, and getting those
 * wrong is how a display ends up confidently showing 655 volts. Handled here:
 *
 * - `BATTERY_STATUS.voltages` is millivolts, with `UINT16_MAX` marking a cell
 *   that does not exist. Only that sentinel is dropped — a genuine `0 mV` cell
 *   is a dead cell and stays visible, because hiding it is the dangerous choice.
 * - `BATTERY_STATUS.current_battery` is centiamps and **positive while
 *   discharging**, the opposite of the ROS convention the gauge uses, so the
 *   sign is flipped here.
 * - `battery_remaining` and `temperature` use `-1` and `INT16_MAX` as "unknown".
 *
 * @module @resq-systems/ui/adapters/mavlink
 */

import type { BatteryGaugeProps } from "../components/battery-gauge/index.js";
import type { CompassRoseProps } from "../components/compass-rose/index.js";
import type { TiltIndicatorProps } from "../components/tilt-indicator/index.js";

//#region Constants

const RAD_TO_DEG = 180 / Math.PI;
const FULL_TURN = 360;

/** Sentinels MAVLink uses for "not available". */
const UINT16_MAX = 65_535;
const INT16_MAX = 32_767;
const UNKNOWN = -1;

/** Scaled-integer divisors. */
const MILLI = 1000;
const CENTI = 100;

/** Metres per second in one knot. */
const KNOT_MS = 0.514_444;

/** Standard sea-level pressure in hectopascals. */
const SEA_LEVEL_HPA = 1013.25;
/** Seawater density in kg/m³. */
const SEAWATER_DENSITY = 1025;
/** Standard gravity in m/s². */
const GRAVITY = 9.806_65;
/** Pascals per hectopascal. */
const PA_PER_HPA = 100;

//#endregion

//#region Message shapes

/** Minimal `ATTITUDE` — angles in radians. */
export interface MavlinkAttitude {
	roll: number;
	pitch: number;
	yaw: number;
}

/** Minimal `VFR_HUD`. */
export interface MavlinkVfrHud {
	/** Heading in whole degrees, 0–359. */
	heading?: number;
	/** Ground speed in metres per second. */
	groundspeed?: number;
}

/** Minimal `SCALED_PRESSURE` / `SCALED_PRESSURE2`. */
export interface MavlinkScaledPressure {
	/** Absolute pressure in hectopascals. */
	press_abs: number;
}

/** Minimal `BATTERY_STATUS`. */
export interface MavlinkBatteryStatus {
	/** Per-cell voltages in millivolts; `UINT16_MAX` marks an absent cell. */
	voltages?: readonly number[];
	/** Battery current in centiamps, positive while discharging; `-1` unknown. */
	current_battery?: number;
	/** Remaining charge as a whole percentage; `-1` unknown. */
	battery_remaining?: number;
	/** Temperature in centi-degrees Celsius; `INT16_MAX` unknown. */
	temperature?: number;
}

/** Options for converting pressure to depth. */
export interface DepthFromPressureOptions {
	/** Surface pressure in hectopascals. Defaults to 1013.25. */
	surfacePressureHpa?: number;
	/** Water density in kg/m³. Defaults to 1025 (seawater); use 1000 for fresh. */
	waterDensity?: number;
}

//#endregion

//#region Helpers

/** Finite number or `undefined`. */
function optional(value: number | undefined): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Finite, non-sentinel number or `undefined`. */
function withoutSentinel(value: number | undefined, sentinel: number): number | undefined {
	const finite = optional(value);
	return finite === undefined || finite === sentinel ? undefined : finite;
}

//#endregion

//#region Mappers

/** `ATTITUDE` → {@link TiltIndicatorProps} roll and pitch, in degrees. */
export function attitudeToTilt(
	attitude: Readonly<MavlinkAttitude>,
): Pick<TiltIndicatorProps, "roll" | "pitch"> {
	return {
		pitch: attitude.pitch * RAD_TO_DEG,
		roll: attitude.roll * RAD_TO_DEG,
	};
}

/** `ATTITUDE` → heading in degrees, wrapped into 0–359. */
export function attitudeToHeading(attitude: Readonly<MavlinkAttitude>): number {
	const degrees = attitude.yaw * RAD_TO_DEG;
	return ((degrees % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/**
 * `VFR_HUD` → {@link CompassRoseProps}. Ground speed is metres per second on the
 * wire and knots on the instrument.
 *
 * MAVLink reports no course over ground here, so `course` is left to the caller
 * — typically from `GLOBAL_POSITION_INT`. Without it the rose shows heading
 * only, which is honest: there is no drift information to display.
 */
export function vfrHudToCompass(
	hud: Readonly<MavlinkVfrHud>,
): Pick<CompassRoseProps, "heading" | "speed"> {
	const groundspeed = optional(hud.groundspeed);
	return {
		heading: optional(hud.heading),
		speed: groundspeed === undefined ? undefined : groundspeed / KNOT_MS,
	};
}

/**
 * Absolute pressure → depth below the surface, in metres.
 *
 * `depth = (P − P₀) / (ρ g)`, with pressures converted from hectopascals to
 * pascals. Roughly 10 m per bar in seawater.
 *
 * @example
 * ```ts
 * pressureToDepth(2013.25);                        // ≈ 9.95 m of seawater
 * pressureToDepth(2013.25, { waterDensity: 1000 }); // ≈ 10.2 m of fresh water
 * ```
 */
export function pressureToDepth(
	pressureHpa: number,
	options: Readonly<DepthFromPressureOptions> = {},
): number {
	const surface = optional(options.surfacePressureHpa) ?? SEA_LEVEL_HPA;
	const density = optional(options.waterDensity) ?? SEAWATER_DENSITY;
	const safeDensity = density > 0 ? density : SEAWATER_DENSITY;

	return ((pressureHpa - surface) * PA_PER_HPA) / (safeDensity * GRAVITY);
}

/**
 * `BATTERY_STATUS` → {@link BatteryGaugeProps}.
 *
 * Pack voltage is summed from the reported cells rather than taken from a
 * separate field, so it always agrees with the cell strip beside it.
 */
export function batteryStatusToProps(
	status: Readonly<MavlinkBatteryStatus>,
): Pick<BatteryGaugeProps, "percentage" | "voltage" | "current" | "temperature" | "cellVoltages"> {
	const cells = (status.voltages ?? [])
		.filter((millivolts) => Number.isFinite(millivolts) && millivolts !== UINT16_MAX)
		.map((millivolts) => millivolts / MILLI);

	const centiamps = withoutSentinel(status.current_battery, UNKNOWN);
	const centidegrees = withoutSentinel(status.temperature, INT16_MAX);

	return {
		cellVoltages: cells.length > 0 ? cells : undefined,
		// MAVLink is positive while discharging; the gauge is negative.
		current: centiamps === undefined ? undefined : -centiamps / CENTI,
		percentage: withoutSentinel(status.battery_remaining, UNKNOWN),
		temperature: centidegrees === undefined ? undefined : centidegrees / CENTI,
		voltage: cells.length > 0 ? cells.reduce((sum, volts) => sum + volts, 0) : undefined,
	};
}

//#endregion
