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
/** biome-ignore-all lint/complexity/noStaticOnlyClass: just ignore it */

/**
 * @fileoverview Distance calculation utility supporting multiple formulas
 * for geospatial and mathematical distance computations.
 *
 * @module @resq-systems/dsa/distance
 *
 * @example
 * ```ts
 * import { Distance } from '@resq-systems/dsa';
 *
 * // Geographic distance between two points
 * const nyc = { lat: 40.7128, lng: -74.0060 };
 * const london = { lat: 51.5074, lng: -0.1278 };
 * const km = Distance.haversine(nyc, london);
 * console.log(`Distance: ${km.toFixed(2)} km`); // ~5570 km
 *
 * // Generic calculate method
 * const euclidean = Distance.calculate('euclidean', nyc, london);
 *
 * // 3D distance with altitude
 * const pointA = { lat: 40.7128, lng: -74.0060, alt: 100 };
 * const pointB = { lat: 51.5074, lng: -0.1278, alt: 200 };
 * const dist3d = Distance.threed(pointA, pointB);
 * ```
 */

import { assertNever } from "./_assert.js";
import type { Latitude, Longitude } from "./schemas.js";

//#region Types

/**
 * Available distance calculation formulas.
 * @category Types
 */
export type DistanceFormula =
	/** Straight-line distance in a plane */
	| "euclidean"
	/** Great-circle distance on a sphere (Earth) */
	| "haversine"
	/** Ellipsoidal geodesic distance (WGS-84) */
	| "vincenty"
	/** Sum of absolute coordinate differences (taxicab) */
	| "manhattan"
	/** Maximum coordinate difference (chessboard) */
	| "chebyshev"
	/** Generalized distance metric with parameter p */
	| "minkowski"
	/** Euclidean distance in 3D space with altitude */
	| "threed"
	/** Angular distance between vectors */
	| "cosine"
	/** Count of differing positions (for binary vectors) */
	| "hamming"
	/** Set dissimilarity measure */
	| "jaccard"
	/** Set overlap dissimilarity measure */
	| "sorensen-dice";

/**
 * 2D coordinates with latitude and longitude.
 * @category Types
 */
export interface Coordinates2D {
	/** Latitude in degrees, branded to `[-90, 90]` — see {@link Latitude}. */
	lat: Latitude;
	/** Longitude in degrees, branded to `[-180, 180]` — see {@link Longitude}. */
	lng: Longitude;
}

/**
 * 3D coordinates with latitude, longitude, and altitude.
 * @category Types
 */
export interface Coordinates3D extends Coordinates2D {
	/** Altitude in meters */
	alt: number;
}

/**
 * The point shape a given formula requires. Every formula operates on 2D
 * coordinates except `"threed"`, which needs an altitude component. Used to
 * make {@link Distance.calculate} reject 2D points for the 3D formula at the
 * type level.
 * @category Types
 */
export type PointFor<F extends DistanceFormula> = F extends "threed"
	? Coordinates3D
	: Coordinates2D;

/**
 * Options for distance calculations.
 * @category Types
 */
export interface DistanceOptions {
	/**
	 * Minkowski norm order. Must be strictly positive (`> 0`); `Infinity` is
	 * accepted and yields Chebyshev distance. Defaults to `2` when omitted.
	 * - p=1: Manhattan distance
	 * - p=2: Euclidean distance
	 * - p=Infinity: Chebyshev distance
	 */
	p?: number;
}

/**
 * Outcome of a non-throwing distance calculation ({@link Distance.calculateSafe}).
 *
 * The {@link valid} flag governs the other fields: when `valid` is `true`,
 * `distance` holds a finite result and `error` is absent; when `valid` is
 * `false`, `distance` is `NaN` and `error` carries the failure message.
 * @category Types
 */
export interface DistanceResult {
	/** The computed distance, or `NaN` when `valid` is `false`. */
	distance: number;
	/** The formula that was requested (echoed back regardless of outcome). */
	formula: DistanceFormula;
	/** `true` if the calculation succeeded; see the field constraints above. */
	valid: boolean;
	/** Present only when `valid` is `false`: the validation failure message. */
	error?: string;
}

//#endregion

//#region Validation

/**
 * Error thrown when coordinate validation fails.
 * @category Errors
 */
class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

function validateCoordinates2D(point: Coordinates2D, name: string): void {
	if (typeof point.lat !== "number" || typeof point.lng !== "number") {
		throw new ValidationError(`${name} must have numeric lat and lng properties`);
	}
	if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
		throw new ValidationError(`${name} coordinates must be finite numbers`);
	}
}

function validateCoordinates3D(point: Coordinates3D, name: string): void {
	validateCoordinates2D(point, name);
	if (typeof point.alt !== "number") {
		throw new ValidationError(`${name} must have numeric alt property`);
	}
	if (!Number.isFinite(point.alt)) {
		throw new ValidationError(`${name} altitude must be a finite number`);
	}
}

function validateGeographicCoordinates(point: Coordinates2D, name: string): void {
	validateCoordinates2D(point, name);
	if (point.lat < -90 || point.lat > 90) {
		throw new ValidationError(`${name} latitude must be between -90 and 90`);
	}
	if (point.lng < -180 || point.lng > 180) {
		throw new ValidationError(`${name} longitude must be between -180 and 180`);
	}
}

/**
 * Runtime narrowing guard for 3D coordinates. Lets the `"threed"` branch of
 * {@link Distance.calculate} narrow a generically-typed point to
 * {@link Coordinates3D} without an unsound cast, and also rejects untyped
 * callers that slip a 2D point past the compiler.
 */
function isCoordinates3D(point: Coordinates2D | Coordinates3D): point is Coordinates3D {
	return "alt" in point && typeof point.alt === "number";
}

//#endregion

//#region Constants

/** Earth's mean radius in kilometers */
const EARTH_RADIUS_KM = 6371;

/** WGS-84 ellipsoid parameters for Vincenty formula */
const WGS84 = {
	/** Semi-major axis in meters */
	a: 6378137,
	/** Semi-minor axis in meters */
	b: 6356752.31424518,
	/** Flattening */
	f: 1 / 298.257223563,
} as const;

/** Maximum iterations for Vincenty formula convergence */
const VINCENTY_ITERATION_LIMIT = 100;

/** Convergence threshold for Vincenty formula */
const VINCENTY_CONVERGENCE_THRESHOLD = 1e-12;

//#endregion

//#region Public API

/**
 * Distance calculation utility class.
 *
 * Provides multiple distance formulas for different use cases:
 * - **Geographic distances**: haversine, vincenty (for Earth coordinates)
 * - **Mathematical distances**: euclidean, manhattan, chebyshev, minkowski
 * - **Vector distances**: cosine, hamming
 * - **Set distances**: jaccard, sorensen-dice
 *
 * @category Geometry
 */
export class Distance {
	/**
	 * Straight-line (L2) distance between two points, treating `lat`/`lng` as
	 * plain planar coordinates rather than geographic ones.
	 *
	 * @param point1 - First point.
	 * @param point2 - Second point.
	 * @returns The Euclidean distance in coordinate units.
	 * @throws {ValidationError} If either point has non-finite coordinates.
	 */
	static euclidean(point1: Coordinates2D, point2: Coordinates2D): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		const dLat = point2.lat - point1.lat;
		const dLng = point2.lng - point1.lng;
		return Math.hypot(dLat, dLng);
	}

	/**
	 * Great-circle distance between two geographic points on a spherical Earth.
	 * Fast and accurate to ~0.5% — prefer {@link Distance.vincenty} when
	 * ellipsoidal precision matters.
	 *
	 * @param point1 - First geographic point.
	 * @param point2 - Second geographic point.
	 * @returns The distance in kilometres.
	 * @throws {ValidationError} If either point is outside valid lat/lng ranges.
	 */
	static haversine(point1: Coordinates2D, point2: Coordinates2D): number {
		validateGeographicCoordinates(point1, "point1");
		validateGeographicCoordinates(point2, "point2");

		const toRad = (degrees: number) => (degrees * Math.PI) / 180;

		const dLat = toRad(point2.lat - point1.lat);
		const dLng = toRad(point2.lng - point1.lng);
		const lat1 = toRad(point1.lat);
		const lat2 = toRad(point2.lat);

		const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return EARTH_RADIUS_KM * c;
	}

	/**
	 * Convenience wrapper around {@link Distance.haversine} returning metres
	 * instead of kilometres.
	 *
	 * @param point1 - First geographic point.
	 * @param point2 - Second geographic point.
	 * @returns The great-circle distance in metres.
	 * @throws {ValidationError} If either point is outside valid lat/lng ranges.
	 */
	static haversineMeters(point1: Coordinates2D, point2: Coordinates2D): number {
		return Distance.haversine(point1, point2) * 1000;
	}

	/**
	 * Ellipsoidal geodesic distance on the WGS-84 spheroid via Vincenty's
	 * inverse formula. More accurate than {@link Distance.haversine} but
	 * iterative, and it may fail to converge for near-antipodal points.
	 *
	 * @param point1 - First geographic point.
	 * @param point2 - Second geographic point.
	 * @returns The geodesic distance in kilometres.
	 * @throws {ValidationError} If either point is out of range, or if the
	 *   iteration fails to converge (near-antipodal points).
	 */
	static vincenty(point1: Coordinates2D, point2: Coordinates2D): number {
		validateGeographicCoordinates(point1, "point1");
		validateGeographicCoordinates(point2, "point2");

		const toRad = (degrees: number) => (degrees * Math.PI) / 180;

		const phi1 = toRad(point1.lat);
		const lambda1 = toRad(point1.lng);
		const phi2 = toRad(point2.lat);
		const lambda2 = toRad(point2.lng);

		const L = lambda2 - lambda1;

		// Handle identical points
		if (L === 0 && phi1 === phi2) return 0;

		const U1 = Math.atan((1 - WGS84.f) * Math.tan(phi1));
		const U2 = Math.atan((1 - WGS84.f) * Math.tan(phi2));

		const sinU1 = Math.sin(U1);
		const cosU1 = Math.cos(U1);
		const sinU2 = Math.sin(U2);
		const cosU2 = Math.cos(U2);

		let lambda = L;
		let lambdaP: number;
		let iter = 0;
		let cosSqAlpha = 0;
		let sinSigma = 0;
		let cos2SigmaM = 0;
		let sigma = 0;
		let cosSigma = 0;

		do {
			const sinLambda = Math.sin(lambda);
			const cosLambda = Math.cos(lambda);

			sinSigma = Math.hypot(cosU2 * sinLambda, cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);

			if (sinSigma === 0) return 0; // Coincident points

			cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
			sigma = Math.atan2(sinSigma, cosSigma);
			const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
			cosSqAlpha = 1 - sinAlpha ** 2;

			// Handle equatorial line
			cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

			const C = (WGS84.f / 16) * cosSqAlpha * (4 + WGS84.f * (4 - 3 * cosSqAlpha));
			lambdaP = lambda;
			lambda =
				L +
				(1 - C) *
					WGS84.f *
					sinAlpha *
					(sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));

			iter++;
			if (iter >= VINCENTY_ITERATION_LIMIT) {
				throw new ValidationError("Vincenty formula failed to converge. Points may be antipodal.");
			}
		} while (Math.abs(lambda - lambdaP) > VINCENTY_CONVERGENCE_THRESHOLD);

		const uSq = (cosSqAlpha * (WGS84.a ** 2 - WGS84.b ** 2)) / WGS84.b ** 2;
		const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
		const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

		const deltaSigma =
			B *
			sinSigma *
			(cos2SigmaM +
				(B / 4) *
					(cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
						(B / 6) * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));

		const distanceMeters = WGS84.b * A * (sigma - deltaSigma);
		return distanceMeters / 1000;
	}

	/**
	 * Taxicab (L1) distance: the sum of the absolute coordinate differences.
	 *
	 * @param point1 - First point.
	 * @param point2 - Second point.
	 * @returns The Manhattan distance in coordinate units.
	 * @throws {ValidationError} If either point has non-finite coordinates.
	 */
	static manhattan(point1: Coordinates2D, point2: Coordinates2D): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		return Math.abs(point1.lat - point2.lat) + Math.abs(point1.lng - point2.lng);
	}

	/**
	 * Chessboard (L∞) distance: the largest single-axis coordinate difference.
	 *
	 * @param point1 - First point.
	 * @param point2 - Second point.
	 * @returns The Chebyshev distance in coordinate units.
	 * @throws {ValidationError} If either point has non-finite coordinates.
	 */
	static chebyshev(point1: Coordinates2D, point2: Coordinates2D): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		return Math.max(Math.abs(point1.lat - point2.lat), Math.abs(point1.lng - point2.lng));
	}

	/**
	 * Generalised Lp distance. Reduces to Manhattan at `p = 1`, Euclidean at
	 * `p = 2`, and Chebyshev at `p = Infinity`.
	 *
	 * @param point1 - First point.
	 * @param point2 - Second point.
	 * @param p - Order of the norm; must be a positive finite number (or
	 *   `Infinity`). Defaults to `2` (Euclidean).
	 * @returns The Minkowski distance in coordinate units.
	 * @throws {ValidationError} If a point is non-finite or `p <= 0`.
	 */
	static minkowski(point1: Coordinates2D, point2: Coordinates2D, p: number = 2): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		if (!Number.isFinite(p) || p <= 0) {
			throw new ValidationError("Minkowski parameter p must be a positive finite number");
		}

		if (p === Infinity) {
			return Distance.chebyshev(point1, point2);
		}

		const dLat = Math.abs(point1.lat - point2.lat);
		const dLng = Math.abs(point1.lng - point2.lng);

		return (dLat ** p + dLng ** p) ** (1 / p);
	}

	/**
	 * Euclidean distance in 3D, treating `alt` as the third axis alongside
	 * `lat`/`lng`.
	 *
	 * @param point1 - First 3D point.
	 * @param point2 - Second 3D point.
	 * @returns The 3D Euclidean distance in coordinate units.
	 * @throws {ValidationError} If either point lacks a finite `alt` or has
	 *   non-finite coordinates.
	 */
	static threed(point1: Coordinates3D, point2: Coordinates3D): number {
		validateCoordinates3D(point1, "point1");
		validateCoordinates3D(point2, "point2");

		return Math.hypot(point1.lat - point2.lat, point1.lng - point2.lng, point1.alt - point2.alt);
	}

	/**
	 * Cosine distance (`1 - cosine similarity`) between the two coordinates read
	 * as 2D vectors from the origin. Ranges from `0` (identical direction) to
	 * `2` (opposite direction).
	 *
	 * @param point1 - First vector.
	 * @param point2 - Second vector.
	 * @returns The cosine distance in `[0, 2]`.
	 * @throws {ValidationError} If a point is non-finite or is the zero vector.
	 */
	static cosine(point1: Coordinates2D, point2: Coordinates2D): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		const dotProduct = point1.lat * point2.lat + point1.lng * point2.lng;
		const magnitude1 = Math.hypot(point1.lat, point1.lng);
		const magnitude2 = Math.hypot(point2.lat, point2.lng);

		if (magnitude1 === 0 || magnitude2 === 0) {
			throw new ValidationError("Cannot calculate cosine distance for zero vectors");
		}

		const similarity = dotProduct / (magnitude1 * magnitude2);
		// Clamp to [-1, 1] to handle floating point errors
		const clampedSimilarity = Math.max(-1, Math.min(1, similarity));
		return 1 - clampedSimilarity;
	}

	/**
	 * Hamming distance: the count of coordinate positions whose values differ.
	 * Intended for discrete/binary vectors encoded as `lat`/`lng`.
	 *
	 * @param point1 - First vector.
	 * @param point2 - Second vector.
	 * @returns The number of differing positions (`0`, `1`, or `2`).
	 * @throws {ValidationError} If either point has non-finite coordinates.
	 */
	static hamming(point1: Coordinates2D, point2: Coordinates2D): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		const vec1 = [point1.lat, point1.lng];
		const vec2 = [point2.lat, point2.lng];

		return vec1.reduce((distance, val, i) => {
			return distance + (val === vec2[i] ? 0 : 1);
		}, 0);
	}

	/**
	 * Jaccard distance (`1 - |A ∩ B| / |A ∪ B|`) between the two coordinates
	 * read as sets of their `lat`/`lng` values.
	 *
	 * @param point1 - First set of values.
	 * @param point2 - Second set of values.
	 * @returns The Jaccard distance in `[0, 1]`.
	 * @throws {ValidationError} If either point has non-finite coordinates.
	 */
	static jaccard(point1: Coordinates2D, point2: Coordinates2D): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		const setA = new Set([point1.lat, point1.lng]);
		const setB = new Set([point2.lat, point2.lng]);

		const intersection = new Set([...setA].filter((x) => setB.has(x)));
		const union = new Set([...setA, ...setB]);

		if (union.size === 0) return 0;

		return 1 - intersection.size / union.size;
	}

	/**
	 * Sørensen–Dice distance (`1 - 2|A ∩ B| / (|A| + |B|)`) between the two
	 * coordinates read as sets of their `lat`/`lng` values.
	 *
	 * @param point1 - First set of values.
	 * @param point2 - Second set of values.
	 * @returns The Sørensen–Dice distance in `[0, 1]`.
	 * @throws {ValidationError} If either point has non-finite coordinates.
	 */
	static sorensenDice(point1: Coordinates2D, point2: Coordinates2D): number {
		validateCoordinates2D(point1, "point1");
		validateCoordinates2D(point2, "point2");

		const setA = new Set([point1.lat, point1.lng]);
		const setB = new Set([point2.lat, point2.lng]);

		const intersection = new Set([...setA].filter((x) => setB.has(x)));
		const denominator = setA.size + setB.size;

		if (denominator === 0) return 0;

		return 1 - (2 * intersection.size) / denominator;
	}

	/**
	 * Dispatch to the named distance formula. {@link PointFor} constrains the
	 * point shape at the type level, so `"threed"` requires 3D points and every
	 * other formula requires 2D points.
	 *
	 * @template F - The selected {@link DistanceFormula}.
	 * @param formula - Which distance formula to apply.
	 * @param point1 - First point, of the shape the formula requires.
	 * @param point2 - Second point, of the shape the formula requires.
	 * @param options - Formula options; only `p` (Minkowski order) is consulted.
	 * @returns The computed distance in the formula's native units.
	 * @throws {ValidationError} If the points are invalid for the formula.
	 * @see {@link Distance.calculateSafe} for a non-throwing variant.
	 */
	static calculate<F extends DistanceFormula>(
		formula: F,
		point1: PointFor<F>,
		point2: PointFor<F>,
		options: DistanceOptions = {},
	): number {
		switch (formula) {
			case "euclidean":
				return Distance.euclidean(point1, point2);
			case "haversine":
				return Distance.haversine(point1, point2);
			case "vincenty":
				return Distance.vincenty(point1, point2);
			case "manhattan":
				return Distance.manhattan(point1, point2);
			case "chebyshev":
				return Distance.chebyshev(point1, point2);
			case "minkowski":
				return Distance.minkowski(point1, point2, options.p);
			case "threed": {
				if (isCoordinates3D(point1) && isCoordinates3D(point2)) {
					return Distance.threed(point1, point2);
				}
				throw new ValidationError("threed formula requires 3D coordinates with a numeric alt");
			}
			case "cosine":
				return Distance.cosine(point1, point2);
			case "hamming":
				return Distance.hamming(point1, point2);
			case "jaccard":
				return Distance.jaccard(point1, point2);
			case "sorensen-dice":
				return Distance.sorensenDice(point1, point2);
			default:
				return assertNever(formula);
		}
	}

	/**
	 * Non-throwing wrapper around {@link Distance.calculate}: catches validation
	 * failures and reports them in the returned {@link DistanceResult} instead
	 * of throwing, so callers can branch on `valid`.
	 *
	 * @template F - The selected {@link DistanceFormula}.
	 * @param formula - Which distance formula to apply.
	 * @param point1 - First point, of the shape the formula requires.
	 * @param point2 - Second point, of the shape the formula requires.
	 * @param options - Formula options; only `p` (Minkowski order) is consulted.
	 * @returns A result with the distance (or `NaN`), the formula, a `valid`
	 *   flag, and an `error` message on failure.
	 */
	static calculateSafe<F extends DistanceFormula>(
		formula: F,
		point1: PointFor<F>,
		point2: PointFor<F>,
		options: DistanceOptions = {},
	): DistanceResult {
		try {
			const distance = Distance.calculate(formula, point1, point2, options);
			return {
				distance,
				formula,
				valid: true,
			};
		} catch (error) {
			return {
				distance: Number.NaN,
				formula,
				valid: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Recommend a geographic formula for an expected distance range, trading
	 * speed for accuracy: `"haversine"` for short hops, `"vincenty"` once
	 * ellipsoidal error starts to matter.
	 *
	 * @param maxDistanceKm - Expected upper bound of the distances to compute,
	 *   in kilometres. Omit to assume a short range.
	 * @returns `"haversine"` below 1000 km, otherwise `"vincenty"`.
	 */
	static recommendGeoFormula(maxDistanceKm?: number): DistanceFormula {
		if (!maxDistanceKm || maxDistanceKm < 1000) {
			return "haversine";
		}
		return "vincenty";
	}
}
//#endregion
