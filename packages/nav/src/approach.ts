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
 * @fileoverview Closest point of approach, as planar geometry.
 *
 * This module knows nothing about AIS, radar, or any other message format — it takes a
 * relative position and a relative velocity and solves for the minimum of the range
 * function. Protocol-shaped wrappers live with their protocol adapters.
 *
 * The solution assumes both parties hold course and speed, which is what every ARPA
 * assumes and is worth remembering when reading the number: **it is a projection, not a
 * prediction**. Two vessels in an encounter are precisely the two vessels least likely to
 * hold course and speed.
 *
 * CPA and TCPA thresholds are engineering policy, not COLREG rules. Nothing here
 * determines stand-on or give-way status.
 *
 * @module @resq-systems/nav/approach
 */

import type { LocalOffset } from "./geo.js";

//#region Constants

/** Minutes in one hour — TCPA is reported in minutes. */
const MINUTES_PER_HOUR = 60;

//#endregion

//#region Types

/** Where an approach solution's inputs came from. */
export type ApproachSource = "ais" | "radar" | "fused";

/** The geometry of a closest-approach solution, independent of its source. */
export interface ApproachGeometry {
	/** Closest approach distance, nautical miles. */
	readonly cpa: number;
	/** Minutes until closest approach; `0` when it has already passed. */
	readonly tcpa: number;
	/**
	 * `true` when closest approach is already behind us and the range is now growing.
	 *
	 * Without this flag an opening contact and a contact at its closest approach *right
	 * now* are indistinguishable — both report `tcpa: 0`. That difference is the whole
	 * question an operator is asking.
	 */
	readonly opening: boolean;
	/**
	 * The assumption under which `cpa` and `tcpa` were computed. Present so that a
	 * consumer rendering the number cannot forget what it rests on.
	 */
	readonly model: "constant-velocity";
}

/** An approach solution carrying the provenance of its inputs. */
export interface Approach extends ApproachGeometry {
	/** Which sensor produced the contact's motion. */
	readonly source?: ApproachSource;
	/** Epoch milliseconds of the contact report the solution was built from. */
	readonly observedAt?: number;
}

//#endregion

//#region Solver

/**
 * Solve the closest point of approach for a relative position and relative velocity.
 *
 * @param offset Contact position relative to the observer, east/north in nautical miles.
 * @param relativeVelocity Contact velocity relative to the observer, east/north in knots.
 * @returns The approach geometry, or `null` when either vector is not finite. A solution
 *   computed from a guessed course is worse than no solution at all, so callers that
 *   cannot supply real motion should not fabricate one.
 */
export function closestApproach(
	offset: Readonly<LocalOffset>,
	relativeVelocity: Readonly<LocalOffset>,
): ApproachGeometry | null {
	if (
		!Number.isFinite(offset.east) ||
		!Number.isFinite(offset.north) ||
		!Number.isFinite(relativeVelocity.east) ||
		!Number.isFinite(relativeVelocity.north)
	) {
		return null;
	}

	const range = Math.hypot(offset.east, offset.north);
	const relativeSpeedSquared = relativeVelocity.east ** 2 + relativeVelocity.north ** 2;

	// Identical velocities: the range never changes, so now is as close as it gets — and
	// the contact is not opening, it is holding station.
	if (relativeSpeedSquared === 0) {
		return { cpa: range, model: "constant-velocity", opening: false, tcpa: 0 };
	}

	const hoursToCpa =
		-(offset.east * relativeVelocity.east + offset.north * relativeVelocity.north) /
		relativeSpeedSquared;

	// Already past closest approach — the contact is opening.
	if (hoursToCpa <= 0) {
		return { cpa: range, model: "constant-velocity", opening: true, tcpa: 0 };
	}

	return {
		cpa: Math.hypot(
			offset.east + relativeVelocity.east * hoursToCpa,
			offset.north + relativeVelocity.north * hoursToCpa,
		),
		model: "constant-velocity",
		opening: false,
		tcpa: hoursToCpa * MINUTES_PER_HOUR,
	};
}

//#endregion
