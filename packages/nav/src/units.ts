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
 * @fileoverview Unit conversions.
 *
 * Every constant here is an exact definition, not an approximation: the nautical mile,
 * the international foot and the fathom are all defined in terms of the metre, and the
 * knot is one nautical mile per hour. Nothing in this file rounds.
 *
 * These exist because the conversions were previously inlined per-adapter — the Signal K
 * adapter divided by `0.514444` in one place and multiplied by `180 / Math.PI` in
 * another. Inlined conversions are where units bugs come from, and a units bug in a
 * telemetry console is a wrong number that looks entirely plausible.
 */

/** Metres in one nautical mile, by definition. */
export const METRES_PER_NAUTICAL_MILE = 1852;

/** Metres in one international foot, by definition. */
export const METRES_PER_FOOT = 0.3048;

/** Metres in one fathom (six international feet), by definition. */
export const METRES_PER_FATHOM = 1.8288;

/** Metres per second in one knot — one nautical mile per hour. */
export const METRES_PER_SECOND_PER_KNOT = METRES_PER_NAUTICAL_MILE / 3600;

/** NATO mils in one full turn. Not the same as a milliradian (6283.19 per turn). */
export const MILS_PER_TURN = 6400;

/** @param knots Speed in knots. @returns Speed in metres per second. */
export function knotsToMs(knots: number): number {
	return knots * METRES_PER_SECOND_PER_KNOT;
}

/** @param ms Speed in metres per second. @returns Speed in knots. */
export function msToKnots(ms: number): number {
	return ms / METRES_PER_SECOND_PER_KNOT;
}

/** @param nauticalMiles Distance in nautical miles. @returns Distance in metres. */
export function nauticalMilesToMetres(nauticalMiles: number): number {
	return nauticalMiles * METRES_PER_NAUTICAL_MILE;
}

/** @param metres Distance in metres. @returns Distance in nautical miles. */
export function metresToNauticalMiles(metres: number): number {
	return metres / METRES_PER_NAUTICAL_MILE;
}

/** @param feet Distance in international feet. @returns Distance in metres. */
export function feetToMetres(feet: number): number {
	return feet * METRES_PER_FOOT;
}

/** @param metres Distance in metres. @returns Distance in international feet. */
export function metresToFeet(metres: number): number {
	return metres / METRES_PER_FOOT;
}

/** @param fathoms Depth in fathoms. @returns Depth in metres. */
export function fathomsToMetres(fathoms: number): number {
	return fathoms * METRES_PER_FATHOM;
}

/** @param metres Depth in metres. @returns Depth in fathoms. */
export function metresToFathoms(metres: number): number {
	return metres / METRES_PER_FATHOM;
}

/** @param degrees Angle in degrees. @returns Angle in radians. */
export function degreesToRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/** @param radians Angle in radians. @returns Angle in degrees. */
export function radiansToDegrees(radians: number): number {
	return (radians * 180) / Math.PI;
}

/**
 * @param degrees Angle in degrees.
 * @returns Angle in NATO mils (6400 per turn), the artillery convention — not milliradians.
 */
export function degreesToMils(degrees: number): number {
	return (degrees * MILS_PER_TURN) / 360;
}

/**
 * @param mils Angle in NATO mils (6400 per turn).
 * @returns Angle in degrees.
 */
export function milsToDegrees(mils: number): number {
	return (mils * 360) / MILS_PER_TURN;
}
