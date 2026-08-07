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
 * @fileoverview VDA5050 `State` → instrument prop mappers, for AGV fleets.
 *
 * VDA5050 puts the vehicle's identity in the **topic**, not the payload —
 * `<interface>/v<major>/<manufacturer>/<serial>/<topic>` — so {@link parseTopic}
 * is as much a part of this adapter as the payload mappers, and pairs with the
 * topic-filtered `MqttTelemetrySource` in `@resq-systems/telemetry`.
 *
 * Two payload details that matter:
 *
 * - `batteryState.batteryCharge` is already a 0–100 percentage, unlike the ROS
 *   0–1 fraction, so it passes straight through.
 * - `agvPosition.positionInitialized` is the AGV telling you it does not trust
 *   its own localisation. {@link stateToPose} returns `null` in that case rather
 *   than plotting a pose the vehicle has disowned.
 *
 * This module reads `State` only. Publishing `Order` or `InstantActions` is a
 * command path with a much larger safety surface and is deliberately out of
 * scope here.
 *
 * @module @resq-systems/ui/adapters/vda5050
 */

import type { BatteryGaugeProps } from "../components/battery-gauge/index.js";
import type { GridPose } from "../components/occupancy-grid/index.js";
import type { TeleopVector } from "../components/teleop-pad/index.js";
import { clamp, optional } from "./numeric.js";

//#region Constants

/** Segment count of a well-formed VDA5050 topic. */
const TOPIC_SEGMENTS = 5;
/** Matches the `v<major>` version segment. */
const VERSION_PATTERN = /^v(\d+)$/;

//#endregion

//#region Message shapes

/** `State.agvPosition`. */
export interface Vda5050AgvPosition {
	x: number;
	y: number;
	/** Orientation in radians. */
	theta: number;
	/** Whether the AGV trusts its localisation. */
	positionInitialized?: boolean;
}

/** `State.batteryState`. */
export interface Vda5050BatteryState {
	/** State of charge as a 0–100 percentage. */
	batteryCharge?: number;
	batteryVoltage?: number;
	charging?: boolean;
}

/** `State.velocity`, in the AGV frame. */
export interface Vda5050Velocity {
	vx?: number;
	vy?: number;
	omega?: number;
}

/** One entry of `State.errors`. */
export interface Vda5050Error {
	errorLevel?: string;
	errorType?: string;
}

/** The subset of a VDA5050 `State` message these mappers read. */
export interface Vda5050State {
	agvPosition?: Vda5050AgvPosition;
	batteryState?: Vda5050BatteryState;
	velocity?: Vda5050Velocity;
	driving?: boolean;
	errors?: readonly Vda5050Error[];
	operatingMode?: string;
}

/** The addressing carried by a VDA5050 topic. */
export interface Vda5050TopicParts {
	interfaceName: string;
	majorVersion: number;
	manufacturer: string;
	serialNumber: string;
	topic: string;
}

/** Counts of outstanding errors by severity. */
export interface Vda5050ErrorSummary {
	warnings: number;
	fatal: number;
}

//#endregion

//#region Helpers

/** Normalize a velocity component against its full scale, guarding zero. */
function normalizeAxis(value: number | undefined, scale: number): number {
	const finite = optional(value);
	if (finite === undefined || !Number.isFinite(scale) || scale <= 0) return 0;
	return clamp(finite / scale, -1, 1);
}

//#endregion

//#region Mappers

/**
 * Split a VDA5050 topic into its addressing parts, or `null` when it is not
 * well-formed.
 *
 * @example
 * ```ts
 * parseTopic("uagv/v2/resq/AGV-7/state");
 * // → { interfaceName: "uagv", majorVersion: 2, manufacturer: "resq",
 * //     serialNumber: "AGV-7", topic: "state" }
 * ```
 */
export function parseTopic(topic: string): Vda5050TopicParts | null {
	const segments = topic.split("/");
	if (segments.length !== TOPIC_SEGMENTS) return null;

	const [interfaceName, version, manufacturer, serialNumber, leaf] = segments;
	const versionMatch = VERSION_PATTERN.exec(version);
	if (versionMatch === null) return null;
	if (interfaceName === "" || manufacturer === "" || serialNumber === "" || leaf === "") {
		return null;
	}

	return {
		interfaceName,
		majorVersion: Number(versionMatch[1]),
		manufacturer,
		serialNumber,
		topic: leaf,
	};
}

/**
 * `State` → {@link GridPose}, or `null` when the AGV reports its localisation as
 * uninitialised or its position is unusable.
 */
export function stateToPose(state: Readonly<Vda5050State>): GridPose | null {
	const position = state.agvPosition;
	if (position === undefined) return null;
	if (position.positionInitialized === false) return null;

	const x = optional(position.x);
	const y = optional(position.y);
	if (x === undefined || y === undefined) return null;

	return { theta: optional(position.theta) ?? 0, x, y };
}

/**
 * `State` → {@link BatteryGaugeProps}. VDA5050 reports no pack current and no
 * per-cell voltages, so those readouts stay blank rather than being invented.
 */
export function stateToBattery(
	state: Readonly<Vda5050State>,
): Pick<BatteryGaugeProps, "percentage" | "voltage"> {
	return {
		percentage: optional(state.batteryState?.batteryCharge),
		voltage: optional(state.batteryState?.batteryVoltage),
	};
}

/**
 * `State.velocity` → a normalized {@link TeleopVector}, for showing what the
 * vehicle is actually doing next to what was commanded.
 *
 * @example
 * ```tsx
 * <TeleopPad value={stateToCommand(state, { angular: 1.5, linear: 2 })} disabled />
 * ```
 */
export function stateToCommand(
	state: Readonly<Vda5050State>,
	scale: Readonly<{ linear: number; angular: number }>,
): TeleopVector {
	return {
		angular: normalizeAxis(state.velocity?.omega, scale.angular),
		linear: normalizeAxis(state.velocity?.vx, scale.linear),
	};
}

/** Count outstanding errors by severity; `FATAL` is matched case-insensitively. */
export function stateToErrorSummary(state: Readonly<Vda5050State>): Vda5050ErrorSummary {
	let warnings = 0;
	let fatal = 0;

	for (const error of state.errors ?? []) {
		if (error.errorLevel?.toUpperCase() === "FATAL") {
			fatal += 1;
		} else {
			warnings += 1;
		}
	}

	return { fatal, warnings };
}

//#endregion
