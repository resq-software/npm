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
 * @fileoverview AIS position report → {@link ScopeContact} mapping, including
 * closest-point-of-approach solution.
 *
 * AIS gives absolute positions; `ContactScope` plots relative bearing and range,
 * so the conversion needs own-ship position — which is why every function here
 * takes an observer. Reports without a usable position are dropped rather than
 * plotted at a default, because a contact at the wrong place is worse than a
 * contact that is missing.
 *
 * The CPA solution assumes both vessels hold course and speed, which is what
 * every ARPA assumes and is worth remembering when reading the number: it is a
 * projection, not a prediction. When the closest approach is already behind us,
 * `tcpa` is reported as 0 and `cpa` as the present range, rather than a negative
 * time that would sort strangely in a risk list.
 *
 * @module @resq-systems/ui/adapters/ais
 */

import type { ScopeContact } from "../components/contact-scope/index.js";
import { optional } from "./numeric.js";
import {
	bearingDeg,
	courseToVelocity,
	distanceNm,
	isPosition,
	type LatLon,
	toLocalNm,
} from "./geo.js";

//#region Constants

/** Minutes in one hour — TCPA is reported in minutes. */
const MINUTES_PER_HOUR = 60;

//#endregion

//#region Types

/** The fields an AIS position report needs to be plottable. */
export interface AisPositionReport extends LatLon {
	/** Maritime Mobile Service Identity. */
	mmsi: number | string;
	/** Course over ground in degrees true. */
	cog?: number;
	/** Speed over ground in knots. */
	sog?: number;
	/** Vessel name, preferred over the MMSI as a display id. */
	name?: string;
}

/** Own vessel's position and motion, needed to make reports relative. */
export interface OwnShip extends LatLon {
	/** Own course over ground in degrees true. */
	course?: number;
	/** Own speed over ground in knots. */
	speed?: number;
}

/** A closest-point-of-approach solution. */
export interface Approach {
	/** Closest approach distance in nautical miles. */
	cpa: number;
	/** Minutes until closest approach; 0 when it has already passed. */
	tcpa: number;
}

//#endregion

//#region Helpers

/** Prefer a real name over the MMSI, but never an empty string. */
function contactId(report: Readonly<AisPositionReport>): string {
	const name = report.name?.trim();
	return name !== undefined && name !== "" ? name : String(report.mmsi);
}

//#endregion

//#region Mappers

/**
 * Closest-point-of-approach solution between own vessel and a contact.
 *
 * Returns `null` when either vessel's motion is unknown — a CPA computed from a
 * guessed course is worse than no CPA at all.
 *
 * @example
 * ```ts
 * // Head-on at a combined 20 knots, one mile apart: collision in three minutes.
 * computeApproach(
 *   { course: 0, latitude: 0, longitude: 0, speed: 10 },
 *   { cog: 180, latitude: 1 / 60, longitude: 0, mmsi: 1, sog: 10 },
 * ); // → { cpa: 0, tcpa: 3 }
 * ```
 */
export function computeApproach(
	own: Readonly<OwnShip>,
	target: Readonly<AisPositionReport>,
): Approach | null {
	if (!isPosition(own) || !isPosition(target)) return null;

	const ownCourse = optional(own.course);
	const ownSpeed = optional(own.speed);
	const targetCourse = optional(target.cog);
	const targetSpeed = optional(target.sog);
	if (
		ownCourse === undefined ||
		ownSpeed === undefined ||
		targetCourse === undefined ||
		targetSpeed === undefined
	) {
		return null;
	}

	const offset = toLocalNm(own, target);
	const ownVelocity = courseToVelocity(ownCourse, ownSpeed);
	const targetVelocity = courseToVelocity(targetCourse, targetSpeed);
	const relativeEast = targetVelocity.east - ownVelocity.east;
	const relativeNorth = targetVelocity.north - ownVelocity.north;

	const range = Math.hypot(offset.east, offset.north);
	const relativeSpeedSquared = relativeEast ** 2 + relativeNorth ** 2;

	// Identical velocities: the range never changes, so now is as close as it gets.
	if (relativeSpeedSquared === 0) return { cpa: range, tcpa: 0 };

	const hoursToCpa =
		-(offset.east * relativeEast + offset.north * relativeNorth) / relativeSpeedSquared;

	// Already past closest approach — the contact is opening.
	if (hoursToCpa <= 0) return { cpa: range, tcpa: 0 };

	return {
		cpa: Math.hypot(
			offset.east + relativeEast * hoursToCpa,
			offset.north + relativeNorth * hoursToCpa,
		),
		tcpa: hoursToCpa * MINUTES_PER_HOUR,
	};
}

/**
 * AIS position report → {@link ScopeContact}, relative to own vessel. Returns
 * `null` when either position is unusable.
 *
 * @example
 * ```tsx
 * <ContactScope contacts={aisToContacts(reports, ownShip)} heading={ownShip.course} />
 * ```
 */
export function aisToContact(
	report: Readonly<AisPositionReport>,
	own: Readonly<OwnShip>,
): ScopeContact | null {
	if (!isPosition(own) || !isPosition(report)) return null;

	const contact: ScopeContact = {
		bearing: bearingDeg(own, report),
		id: contactId(report),
		range: distanceNm(own, report),
	};

	const course = optional(report.cog);
	if (course !== undefined) contact.course = course;
	const speed = optional(report.sog);
	if (speed !== undefined) contact.speed = speed;

	const approach = computeApproach(own, report);
	if (approach !== null) {
		contact.cpa = approach.cpa;
		contact.tcpa = approach.tcpa;
	}

	return contact;
}

/**
 * Map a batch of reports, dropping any that cannot be plotted. Order is
 * preserved; `ContactScope` sorts by range itself.
 */
export function aisToContacts(
	reports: readonly AisPositionReport[],
	own: Readonly<OwnShip>,
): ScopeContact[] {
	const contacts: ScopeContact[] = [];
	for (const report of reports) {
		const contact = aisToContact(report, own);
		if (contact !== null) contacts.push(contact);
	}
	return contacts;
}

//#endregion
