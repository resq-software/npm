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
			if (current.length >= 2) segments.push(current);
			current = [];
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
