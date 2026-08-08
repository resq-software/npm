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
 * @fileoverview Signal K delta → instrument prop mappers.
 *
 * Signal K streams *deltas*: each message carries only the paths that changed,
 * so no single message describes a whole instrument. {@link applyDelta} folds
 * deltas into a path map the mappers then read, and returns a new map each time
 * rather than mutating in place, so React state updates stay sound.
 *
 * Everything on the wire is SI — radians, metres per second, metres — and every
 * instrument here wants degrees or knots, so unit conversion is most of the job.
 *
 * Deltas also carry an ISO-8601 `timestamp` per update. It is deliberately
 * ignored: how stale a reading may be before it stops being shown is a policy
 * decision that belongs to the application, not to a unit converter.
 *
 * @module @resq-systems/ui/adapters/signalk
 */

import type { CompassRoseProps } from "../components/compass-rose/index.js";
import type { DepthGaugeProps } from "../components/depth-gauge/index.js";

//#region Constants

const RAD_TO_DEG = 180 / Math.PI;
/** Metres per second in one knot. */
const KNOT_MS = 0.514_444;

/** The Signal K paths these mappers read. */
export const SIGNALK_PATHS = {
	courseOverGround: "navigation.courseOverGroundTrue",
	depthBelowKeel: "environment.depth.belowKeel",
	depthBelowSurface: "environment.depth.belowSurface",
	headingTrue: "navigation.headingTrue",
	speedOverGround: "navigation.speedOverGround",
	surfaceToTransducer: "environment.depth.surfaceToTransducer",
	transducerToKeel: "environment.depth.transducerToKeel",
} as const;

//#endregion

//#region Types

/** One path/value pair inside a delta update. */
export interface SignalKValue {
	path: string;
	value: unknown;
}

/** One update block inside a delta. */
export interface SignalKUpdate {
	values?: readonly SignalKValue[];
}

/** A Signal K delta message. */
export interface SignalKDelta {
	context?: string;
	updates?: readonly SignalKUpdate[];
}

/** Accumulated Signal K state, keyed by path. */
export type SignalKPaths = ReadonlyMap<string, unknown>;

//#endregion

//#region Delta folding

/**
 * Flatten a delta into the path/value pairs it carries.
 *
 * @example
 * ```ts
 * flattenDelta({ updates: [{ values: [{ path: "navigation.headingTrue", value: 0.7 }] }] });
 * // → Map { "navigation.headingTrue" => 0.7 }
 * ```
 */
export function flattenDelta(delta: Readonly<SignalKDelta>): Map<string, unknown> {
	const paths = new Map<string, unknown>();
	for (const update of delta.updates ?? []) {
		for (const entry of update.values ?? []) {
			if (typeof entry?.path === "string") paths.set(entry.path, entry.value);
		}
	}
	return paths;
}

/**
 * Fold a delta over previously accumulated paths, returning a **new** map.
 * Callers holding the result in React state can compare by identity.
 */
export function applyDelta(
	previous: SignalKPaths,
	delta: Readonly<SignalKDelta>,
): Map<string, unknown> {
	const next = new Map(previous);
	for (const [path, value] of flattenDelta(delta)) next.set(path, value);
	return next;
}

/** Read a path as a finite number, or `undefined` when absent or non-numeric. */
export function readNumber(paths: SignalKPaths, path: string): number | undefined {
	const value = paths.get(path);
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

//#endregion

//#region Mappers

/**
 * Accumulated paths → {@link CompassRoseProps}.
 *
 * Only `headingTrue` is read; magnetic heading is a different datum and
 * substituting it silently would put a quiet error into the drift readout.
 */
export function signalKToCompass(
	paths: SignalKPaths,
): Pick<CompassRoseProps, "heading" | "course" | "speed"> {
	const heading = readNumber(paths, SIGNALK_PATHS.headingTrue);
	const course = readNumber(paths, SIGNALK_PATHS.courseOverGround);
	const speed = readNumber(paths, SIGNALK_PATHS.speedOverGround);

	return {
		course: course === undefined ? undefined : course * RAD_TO_DEG,
		heading: heading === undefined ? undefined : heading * RAD_TO_DEG,
		speed: speed === undefined ? undefined : speed / KNOT_MS,
	};
}

/**
 * Accumulated paths → {@link DepthGaugeProps}, expressed as keel depth against
 * sounded depth so the instrument's altitude readout becomes under-keel
 * clearance.
 *
 * Keel depth is taken from `surfaceToTransducer + transducerToKeel` when the
 * vessel publishes its offsets, and otherwise reconstructed from
 * `belowSurface − belowKeel`.
 */
export function signalKToDepth(paths: SignalKPaths): Pick<DepthGaugeProps, "depth" | "seabed"> {
	const belowSurface = readNumber(paths, SIGNALK_PATHS.depthBelowSurface);
	const belowKeel = readNumber(paths, SIGNALK_PATHS.depthBelowKeel);
	const surfaceToTransducer = readNumber(paths, SIGNALK_PATHS.surfaceToTransducer);
	const transducerToKeel = readNumber(paths, SIGNALK_PATHS.transducerToKeel);

	let keelDepth: number | undefined;
	if (surfaceToTransducer !== undefined && transducerToKeel !== undefined) {
		keelDepth = surfaceToTransducer + transducerToKeel;
	} else if (belowSurface !== undefined && belowKeel !== undefined) {
		keelDepth = belowSurface - belowKeel;
	}

	return { depth: keelDepth, seabed: belowSurface };
}

//#endregion
