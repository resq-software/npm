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
 * @fileoverview Contact risk ordering.
 *
 * This is policy, not rendering. It previously lived at module scope inside the
 * `ContactScope` component, which meant the one rule here that actually matters —
 * **a contact with no usable CPA is never assumed safe** — was reachable only by that
 * component's render path. Any alert list or map overlay had to reimplement it, and that
 * is precisely the invariant a reimplementation gets wrong.
 *
 * These functions are deliberately structural: they take the minimum shape they need, so
 * a plot record, a track and an alert row can all be ranked by the same rule.
 *
 * Thresholds are not defined here. What counts as a dangerous CPA is an operational
 * decision that belongs to the caller, and this module never invents one.
 *
 * @module @resq-systems/nav/arpa
 */

import { normalizeBearing } from "./geo.js";

//#region Types

/** The minimum a contact needs to be ranked: a range, and optionally a CPA. */
export interface RankableContact {
	/** Range to the contact, in any consistent unit. */
	range: number;
	/** Closest point of approach, in the same unit as `range`. */
	cpa?: number | undefined;
}

//#endregion

//#region Policy

/**
 * Whether a CPA is usable.
 *
 * A negative closest-approach distance is not a shorter one — it is nonsense, and
 * treating it as such would paint the nearest possible risk and hijack any summary line
 * built from this ranking.
 */
export function isUsableCpa(cpa: number | undefined): cpa is number {
	return typeof cpa === "number" && Number.isFinite(cpa) && cpa >= 0;
}

/**
 * Order contacts by how much they matter: a usable CPA first and smallest first, then by
 * range.
 *
 * Contacts with no CPA are **not assumed safe** — they are simply unranked on that axis
 * and fall back to proximity. Sorting them to the front would cry wolf; sorting them out
 * of sight would hide a contact that is not reporting motion, which is often the one
 * worth looking at.
 */
export function compareByRisk(
	left: Readonly<RankableContact>,
	right: Readonly<RankableContact>,
): number {
	const leftCpa = isUsableCpa(left.cpa) ? left.cpa : Number.POSITIVE_INFINITY;
	const rightCpa = isUsableCpa(right.cpa) ? right.cpa : Number.POSITIVE_INFINITY;
	if (leftCpa !== rightCpa) return leftCpa - rightCpa;
	return left.range - right.range;
}

/**
 * The closest contact by range.
 *
 * Searches the given set rather than assuming it is range-sorted, so a caller can pass
 * the contacts it actually drew and have the answer describe what is on screen.
 */
export function nearestByRange<T extends RankableContact>(contacts: readonly T[]): T | null {
	let nearest: T | null = null;
	for (const contact of contacts) {
		if (nearest === null || contact.range < nearest.range) nearest = contact;
	}
	return nearest;
}

/** The contact with the smallest reported CPA, if any reports one. */
export function worstApproach<T extends RankableContact>(contacts: readonly T[]): T | null {
	let worst: T | null = null;
	for (const contact of contacts) {
		if (!isUsableCpa(contact.cpa)) continue;
		if (worst === null || contact.cpa < (worst.cpa as number)) worst = contact;
	}
	return worst;
}

//#endregion

//#region Formatting

/**
 * Three-digit marine bearing, so 7° reads as `007`.
 *
 * The leading zeros are not decoration: a three-digit group is how a bearing is spoken
 * and written at sea, and it keeps a column of bearings aligned.
 */
export function formatBearing(value: number): string {
	return String(Math.round(normalizeBearing(value)) % 360).padStart(3, "0");
}

//#endregion
