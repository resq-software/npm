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
 * @fileoverview Quantities an operator needs that no vehicle transmits.
 *
 * Each function here derives a relationship between measurements the telemetry already
 * carries. None of them takes an engineering parameter the console would have to guess
 * at, and none of them emits a command — those two rules are what keep this file on the
 * right side of the line described in the package README.
 *
 * Every function returns `undefined` rather than a number when an input is missing or
 * unusable. Callers must render that as an absent reading, never as zero.
 */

import type { LatLon, LocalOffset } from "./geo.js";
import { toLocalNm } from "./geo.js";
import { optional } from "./numeric.js";

/** A current or set-and-drift solution. */
export interface Current {
	/**
	 * The direction the current flows **toward**, degrees true in `[0, 360)`.
	 *
	 * Note the asymmetry with wind, which is named for the direction it comes **from**.
	 * Getting this backwards is the classic error, so it is stated on the type.
	 */
	setDeg: number;
	/** Current magnitude, in the same speed unit as the inputs. */
	driftKn: number;
}

/** Forward kinematics of a differential-drive or skid-steer chassis. */
export interface DifferentialDriveMotion {
	/** Forward speed of the body centre, metres per second. */
	speedMs: number;
	/** Yaw rate, radians per second, positive to starboard (clockwise from above). */
	yawRateRadPerSec: number;
}

/** Inputs to a stopping-distance estimate. Every term is supplied by the caller. */
export interface StoppingDistanceInput {
	/** Current speed, metres per second. */
	speedMs: number;
	/** Total sense-to-actuate latency, seconds. */
	latencyS: number;
	/** Achievable braking deceleration, metres per second squared. Must be positive. */
	brakingMs2: number;
	/** Additional safety margin, metres. */
	marginM: number;
}

/** Wrap a signed angle into `(-180, 180]` degrees. */
function wrapSigned(degrees: number): number {
	const wrapped = ((degrees % 360) + 360) % 360;
	return wrapped > 180 ? wrapped - 360 : wrapped;
}

/**
 * The angle between where the bow points and where the vehicle actually travels.
 *
 * On the water this divergence *is* the current, which is why it is worth a dedicated
 * readout rather than leaving the operator to subtract two gauges by eye. On a rover it
 * is sideslip.
 *
 * @param headingTrueDeg Bow direction, degrees true.
 * @param courseOverGroundDeg Direction of travel over ground, degrees true.
 * @returns Signed crab angle in `(-180, 180]` degrees, positive when the track lies to
 *   starboard of the bow. `undefined` if either input is missing or non-finite.
 */
export function crabAngleDeg(
	headingTrueDeg: number | undefined,
	courseOverGroundDeg: number | undefined,
): number | undefined {
	const heading = optional(headingTrueDeg);
	const course = optional(courseOverGroundDeg);
	if (heading === undefined || course === undefined) return undefined;
	return wrapSigned(course - heading);
}

/**
 * The current implied by the difference between ground motion and motion through the water.
 *
 * This is an *observation*, not a forecast: it says what the water was doing over the
 * interval both velocities describe, and nothing about what it will do next.
 *
 * @param ground Velocity over ground, east/north, any consistent speed unit.
 * @param water Velocity through the water, east/north, same unit.
 * @returns Set (degrees true, the direction the current flows toward) and drift (input
 *   speed unit). `undefined` if either velocity component is non-finite.
 */
export function observedCurrent(
	ground: Readonly<LocalOffset>,
	water: Readonly<LocalOffset>,
): Current | undefined {
	const east = optional(ground.east - water.east);
	const north = optional(ground.north - water.north);
	if (east === undefined || north === undefined) return undefined;

	const driftKn = Math.hypot(east, north);
	// atan2(east, north) rather than the usual (y, x): bearings are measured clockwise
	// from north, not counter-clockwise from east.
	const setDeg = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
	return { setDeg, driftKn };
}

/**
 * Driven-wheel slip ratio, `1 - groundSpeed / wheelSpeed`.
 *
 * `0` is pure rolling, `1` is a wheel spinning with no translation. Some slip is required
 * to generate soil shear at all; sustained high slip means the vehicle is excavating
 * rather than driving.
 *
 * @param groundSpeedMs Speed over ground from GNSS or SLAM, metres per second.
 * @param wheelSpeedMs Wheel rim speed from encoders, metres per second.
 * @returns Slip ratio, or `undefined` if either input is missing, non-finite, or the
 *   wheel is not turning — a stationary wheel has no defined slip, and returning `0`
 *   there would read as perfect traction.
 */
export function slipRatio(
	groundSpeedMs: number | undefined,
	wheelSpeedMs: number | undefined,
): number | undefined {
	const ground = optional(groundSpeedMs);
	const wheel = optional(wheelSpeedMs);
	if (ground === undefined || wheel === undefined) return undefined;
	if (wheel <= 0) return undefined;
	return 1 - ground / wheel;
}

/**
 * Distance to a full stop, decomposed rather than lumped.
 *
 * The reaction term matters as much as the braking term: sensing, filtering, planning,
 * link and actuator delay all land in `latencyS`, and at speed they dominate. Reliable
 * perception range must exceed this number, which is why it is displayed rather than
 * assumed.
 *
 * @returns Stopping distance in metres, or `undefined` if any input is non-finite, speed
 *   or latency is negative, margin is negative, or braking deceleration is not positive.
 */
export function stoppingDistanceM(input: Readonly<StoppingDistanceInput>): number | undefined {
	const speed = optional(input.speedMs);
	const latency = optional(input.latencyS);
	const braking = optional(input.brakingMs2);
	const margin = optional(input.marginM);
	if (
		speed === undefined ||
		latency === undefined ||
		braking === undefined ||
		margin === undefined
	) {
		return undefined;
	}
	if (speed < 0 || latency < 0 || margin < 0 || braking <= 0) return undefined;
	return speed * latency + (speed * speed) / (2 * braking) + margin;
}

/**
 * Remaining endurance from measured draw.
 *
 * Takes usable energy, not nameplate capacity — the caller declares what fraction of the
 * pack it is willing to spend, because reserve policy is an operational decision this
 * package has no basis to make.
 *
 * @param usableWh Energy the caller declares as usable, watt-hours.
 * @param averageW Measured average power draw, watts.
 * @returns Hours remaining, or `undefined` if either input is missing, non-finite,
 *   negative, or the draw is zero — infinite endurance is not a useful readout.
 */
export function enduranceHours(
	usableWh: number | undefined,
	averageW: number | undefined,
): number | undefined {
	const energy = optional(usableWh);
	const power = optional(averageW);
	if (energy === undefined || power === undefined) return undefined;
	if (energy < 0 || power <= 0) return undefined;
	return energy / power;
}

/**
 * Instantaneous turn radius from speed and rate of turn.
 *
 * @param speedMs Speed over ground, metres per second.
 * @param rateOfTurnDegPerSec Yaw rate, degrees per second.
 * @returns Radius in metres (always positive), or `undefined` when the vehicle is
 *   effectively straight-running — the radius diverges there, and a very large number is
 *   more misleading than an absent one.
 */
export function turnRadiusM(
	speedMs: number | undefined,
	rateOfTurnDegPerSec: number | undefined,
): number | undefined {
	const speed = optional(speedMs);
	const rate = optional(rateOfTurnDegPerSec);
	if (speed === undefined || rate === undefined) return undefined;
	const radPerSec = Math.abs((rate * Math.PI) / 180);
	if (radPerSec < 1e-6) return undefined;
	return Math.abs(speed) / radPerSec;
}

/**
 * Rate of turn between two heading observations.
 *
 * @param fromHeadingDeg Earlier heading, degrees true.
 * @param toHeadingDeg Later heading, degrees true.
 * @param elapsedS Interval between the two observations, seconds. Must be positive.
 * @returns Degrees per second, positive to starboard. Takes the short way round, so a
 *   sweep through north reads as a small turn rather than a 359° one. `undefined` if any
 *   input is missing, non-finite, or the interval is not positive.
 */
export function rateOfTurnDegPerSec(
	fromHeadingDeg: number | undefined,
	toHeadingDeg: number | undefined,
	elapsedS: number | undefined,
): number | undefined {
	const from = optional(fromHeadingDeg);
	const to = optional(toHeadingDeg);
	const elapsed = optional(elapsedS);
	if (from === undefined || to === undefined || elapsed === undefined) {
		return undefined;
	}
	if (elapsed <= 0) return undefined;
	return wrapSigned(to - from) / elapsed;
}

/**
 * Signed cross-track error against a declared leg.
 *
 * Describes where the vehicle is relative to the intended track. It deliberately stops
 * there: converting an error into a correction is a guidance law, and guidance laws emit
 * commands, which this package does not.
 *
 * @param legStart Leg origin.
 * @param legEnd Leg destination.
 * @param position Current position.
 * @returns Nautical miles, positive when the vehicle lies to **starboard** of the track.
 *   `undefined` if any position is invalid or the leg has zero length.
 */
export function crossTrackNm(
	legStart: Readonly<LatLon>,
	legEnd: Readonly<LatLon>,
	position: Readonly<LatLon>,
): number | undefined {
	const leg = toLocalNm(legStart, legEnd);
	const offset = toLocalNm(legStart, position);
	const legLength = Math.hypot(leg.east, leg.north);
	if (!Number.isFinite(legLength) || legLength < 1e-9) return undefined;
	const crossTrack = (leg.north * offset.east - leg.east * offset.north) / legLength;
	return optional(crossTrack);
}

/**
 * Forward kinematics of a differential-drive chassis.
 *
 * The forward direction only. The inverse — wheel speeds for a desired motion — is a
 * command and is deliberately absent.
 *
 * Note that on a four- or six-wheel skid-steer chassis the yaw rate this returns is an
 * idealisation: fixed wheels cannot all roll about a common centre without scrubbing, so
 * the real turn rate depends on surface, payload and speed. Compare it against a gyro
 * rather than trusting it.
 *
 * @param leftRadPerSec Left wheel angular velocity, radians per second.
 * @param rightRadPerSec Right wheel angular velocity, radians per second.
 * @param wheelRadiusM Wheel radius, metres. Must be positive.
 * @param trackWidthM Distance between left and right contact patches, metres. Must be positive.
 * @returns Body speed and yaw rate, or `undefined` if any input is missing, non-finite,
 *   or a geometry term is not positive.
 */
export function differentialDriveMotion(
	leftRadPerSec: number | undefined,
	rightRadPerSec: number | undefined,
	wheelRadiusM: number | undefined,
	trackWidthM: number | undefined,
): DifferentialDriveMotion | undefined {
	const left = optional(leftRadPerSec);
	const right = optional(rightRadPerSec);
	const radius = optional(wheelRadiusM);
	const track = optional(trackWidthM);
	if (left === undefined || right === undefined || radius === undefined || track === undefined) {
		return undefined;
	}
	if (radius <= 0 || track <= 0) return undefined;
	return {
		speedMs: (radius * (right + left)) / 2,
		yawRateRadPerSec: (radius * (right - left)) / track,
	};
}
