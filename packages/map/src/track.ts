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
 * @fileoverview Build a GeoJSON track (breadcrumb trail) from an ordered list of
 * positions. Points that are not a valid position are dropped; fewer than two valid
 * points yields an empty collection (a line needs two).
 *
 * A track that crosses the antimeridian is emitted as several `LineString` features
 * rather than one. A single feature would have to step from +179 to -179, which renderers
 * draw as a line back across the entire globe — the track would appear to teleport.
 *
 * @module @resq-systems/map/track
 */

import { isPosition } from "@resq-systems/nav/geo";
import type { FeatureCollection, LineString } from "geojson";

/**
 * A longitude step larger than this between consecutive fixes means the track crossed
 * the antimeridian rather than sailing most of the way round the world.
 */
const ANTIMERIDIAN_JUMP_DEG = 180;

/** A longitude/latitude pair in degrees. */
export interface LngLat {
	longitude: number;
	latitude: number;
}

/**
 * Convert ordered positions into a GeoJSON `FeatureCollection` with a single
 * `LineString` feature, suitable for a react-map-gl `<Source type="geojson">`.
 */
/**
 * Where a leg crosses the antimeridian, and at what latitude.
 *
 * Returns the boundary the leg leaves through — `180` travelling east, `-180` travelling
 * west — with the latitude linearly interpolated at that meridian. The far side is the
 * same latitude at the negated longitude.
 */
function antimeridianCrossing(
	from: readonly [number, number],
	to: readonly [number, number],
): { latitude: number; longitude: number } {
	// Signed short-way longitude delta, in (-180, 180].
	const delta = ((to[0] - from[0] + 540) % 360) - 180;
	const longitude = delta > 0 ? ANTIMERIDIAN_JUMP_DEG : -ANTIMERIDIAN_JUMP_DEG;
	const fraction = delta === 0 ? 0 : (longitude - from[0]) / delta;
	return { latitude: from[1] + (to[1] - from[1]) * fraction, longitude };
}

export function toTrackGeoJSON(points: readonly LngLat[]): FeatureCollection<LineString> {
	const coordinates: [number, number][] = [];
	for (const point of points) {
		if (isPosition(point)) coordinates.push([point.longitude, point.latitude]);
	}

	// Break the run wherever it jumps the dateline, so each side draws as its own line.
	const segments: [number, number][][] = [];
	let current: [number, number][] = [];
	for (const [index, coordinate] of coordinates.entries()) {
		const previous = coordinates[index - 1];
		if (previous !== undefined && Math.abs(coordinate[0] - previous[0]) > ANTIMERIDIAN_JUMP_DEG) {
			// Close this run ON the dateline and reopen it on the far side. Splitting
			// without the boundary points would leave a two-fix crossing as two
			// single-point segments, and a line needs two — the track would vanish
			// entirely, which is worse than the globe-spanning line this replaced.
			const crossing = antimeridianCrossing(previous, coordinate);
			current.push([crossing.longitude, crossing.latitude]);
			segments.push(current);
			current = [[-crossing.longitude, crossing.latitude]];
		}
		current.push(coordinate);
	}
	if (current.length >= 2) segments.push(current);

	return {
		features: segments.map((segment) => ({
			geometry: { coordinates: segment, type: "LineString" as const },
			properties: {},
			type: "Feature" as const,
		})),
		type: "FeatureCollection",
	};
}
