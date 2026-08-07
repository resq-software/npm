// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Shared geometry for round-dial instruments (airspeed, altimeter,
 * vertical-speed, …). Pure functions over a fixed 200×200 user-space box; all
 * angles are degrees measured clockwise from the top (12 o'clock).
 *
 * @module @resq-systems/ui/lib/instrument-dial
 */

/** Square SVG user-space edge shared by every instrument. */
export const INSTRUMENT_VIEW = 200;
/** Centre of the instrument in user space. */
export const INSTRUMENT_CENTER = INSTRUMENT_VIEW / 2;

/** A point in instrument user space. */
export interface Point {
	readonly x: number;
	readonly y: number;
}

/** Coerce a possibly-undefined / non-finite input to a finite number. */
export function toFinite(value: number | undefined, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Clamp `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Whether a prop carries a usable reading. Narrows `number | undefined` to
 * `number`, so an instrument can tell "absent" apart from zero and leave a
 * readout blank rather than displaying a fabricated 0.
 */
export function isReading(value: number | undefined): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/**
 * A strictly positive, finite value, or `fallback` when the input is neither.
 * Full-scale ranges and thresholds use this: a zero or negative scale would
 * divide by zero or invert the display, so it is treated as absent.
 */
export function safePositive(value: number | undefined, fallback: number): number {
	const resolved = toFinite(value, fallback);
	return resolved > 0 ? resolved : fallback;
}

/** Point on a circle centred on the instrument, at `angleDeg` clockwise from top. */
export function polar(angleDeg: number, radius: number): Point {
	const rad = (angleDeg * Math.PI) / 180;
	return {
		x: INSTRUMENT_CENTER + radius * Math.sin(rad),
		y: INSTRUMENT_CENTER - radius * Math.cos(rad),
	};
}

/**
 * SVG path string for an arc between two angles at a given radius. Sweeps
 * clockwise when `endAngle >= startAngle`, counter-clockwise otherwise.
 */
export function describeArc(radius: number, startAngle: number, endAngle: number): string {
	const start = polar(startAngle, radius);
	const end = polar(endAngle, radius);
	const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
	const sweep = endAngle >= startAngle ? 1 : 0;
	return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

/**
 * Map a scale `value` (clamped to `[min, max]`) to an angle, starting at
 * `startAngle` and covering `sweep` degrees. A zero-width range maps to
 * `startAngle`.
 */
export function valueToAngle(
	value: number,
	min: number,
	max: number,
	startAngle: number,
	sweep: number,
): number {
	const span = max - min;
	const fraction = span === 0 ? 0 : (clamp(value, min, max) - min) / span;
	return startAngle + fraction * sweep;
}

/**
 * Evenly spaced scale values from `min` to `max` inclusive, split into
 * `divisions` intervals (so `divisions + 1` values are returned).
 */
export function linearTicks(min: number, max: number, divisions: number): number[] {
	const safe = Math.max(1, Math.round(divisions));
	return Array.from({ length: safe + 1 }, (_unused, index) => min + ((max - min) * index) / safe);
}
