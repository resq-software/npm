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
 * positions. Non-finite points are dropped; fewer than two valid points yields
 * an empty collection (a line needs two).
 *
 * @module @resq-systems/map/track
 */

import type { FeatureCollection, LineString } from "geojson";

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
		if (Number.isFinite(point.longitude) && Number.isFinite(point.latitude)) {
			coordinates.push([point.longitude, point.latitude]);
		}
	}

	const features =
		coordinates.length >= 2
			? [
					{
						geometry: { coordinates, type: "LineString" as const },
						properties: {},
						type: "Feature" as const,
					},
				]
			: [];

	return { features, type: "FeatureCollection" };
}
