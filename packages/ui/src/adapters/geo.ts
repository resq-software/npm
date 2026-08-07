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
 * @fileoverview Geodesy for the marine adapters — great-circle range and
 * bearing, plus a flat-earth projection for close-range relative-motion maths.
 *
 * Two models on purpose. Range and bearing use the haversine formula so a
 * contact tens of miles off is still right. CPA/TCPA instead needs a *linear*
 * frame in which velocities are constant vectors, so it uses an equirectangular
 * projection about the observer — valid over the few miles that a collision
 * assessment actually spans, and wrong in exactly the way every ARPA is.
 *
 * @module @resq-systems/ui/adapters/geo
 */

//#region Constants

/** Mean Earth radius in nautical miles. */
const EARTH_RADIUS_NM = 3440.065;
/** Nautical miles per degree of latitude. */
const NM_PER_DEGREE = 60;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const FULL_TURN = 360;

//#endregion

//#region Types

/** A geographic position in decimal degrees. */
export interface LatLon {
	latitude: number;
	longitude: number;
}

/** Local tangent-plane offsets in nautical miles. */
export interface LocalOffset {
	/** Distance east of the origin. */
	east: number;
	/** Distance north of the origin. */
	north: number;
}

//#endregion

//#region Helpers

/** Wrap a bearing into [0, 360). */
export function normalizeBearing(value: number): number {
	return ((value % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/** Whether a position is usable. */
export function isPosition(value: LatLon | undefined): value is LatLon {
	return value !== undefined && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
}

//#endregion

//#region Geodesy

/**
 * Great-circle distance between two positions, in nautical miles.
 *
 * @example
 * ```ts
 * distanceNm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }); // ≈ 60
 * ```
 */
export function distanceNm(from: LatLon, to: LatLon): number {
	const lat1 = from.latitude * DEG_TO_RAD;
	const lat2 = to.latitude * DEG_TO_RAD;
	const deltaLat = lat2 - lat1;
	const deltaLon = (to.longitude - from.longitude) * DEG_TO_RAD;

	const a =
		Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

	return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Initial great-circle bearing from one position to another, in degrees
 * clockwise from true north.
 *
 * @example
 * ```ts
 * bearingDeg({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }); // 0
 * ```
 */
export function bearingDeg(from: LatLon, to: LatLon): number {
	const lat1 = from.latitude * DEG_TO_RAD;
	const lat2 = to.latitude * DEG_TO_RAD;
	const deltaLon = (to.longitude - from.longitude) * DEG_TO_RAD;

	const y = Math.sin(deltaLon) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

	return normalizeBearing(Math.atan2(y, x) * RAD_TO_DEG);
}

/**
 * Project a position into a local east/north frame centred on `origin`, in
 * nautical miles. Equirectangular — intended for the short ranges over which a
 * constant-velocity collision assessment is meaningful, not for navigation.
 */
export function toLocalNm(origin: LatLon, point: LatLon): LocalOffset {
	const meanLat = ((origin.latitude + point.latitude) / 2) * DEG_TO_RAD;
	return {
		east: (point.longitude - origin.longitude) * NM_PER_DEGREE * Math.cos(meanLat),
		north: (point.latitude - origin.latitude) * NM_PER_DEGREE,
	};
}

/**
 * Velocity vector for a course and speed, as east/north components in knots.
 * Course is degrees clockwise from north, so north is `+north` and east is
 * `+east` — the transpose of the usual maths convention.
 */
export function courseToVelocity(courseDeg: number, speedKn: number): LocalOffset {
	const radians = courseDeg * DEG_TO_RAD;
	return {
		east: speedKn * Math.sin(radians),
		north: speedKn * Math.cos(radians),
	};
}

//#endregion
