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
 * @fileoverview TrackLayer — draws a breadcrumb trail (a GeoJSON line) for an
 * ordered list of positions.
 *
 * @module @resq-systems/map/track-layer
 */

"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import { type LngLat, toTrackGeoJSON } from "./track.js";

/** Default amber trail colour. */
const DEFAULT_COLOR = "#f59e0b";

export interface TrackLayerProps {
	/** Unique id — the source/layer ids are derived from it. */
	id: string;
	/** Ordered positions, oldest to newest. */
	points: readonly LngLat[];
	/** Line colour (default amber). */
	color?: string;
	/** Line width in px (default 2). */
	width?: number;
}

/**
 * A GeoJSON breadcrumb trail.
 *
 * @example
 * ```tsx
 * <TrackLayer id={asset.id} points={history} />
 * ```
 */
export function TrackLayer({
	id,
	points,
	color = DEFAULT_COLOR,
	width = 2,
}: Readonly<TrackLayerProps>) {
	const data = useMemo(() => toTrackGeoJSON(points), [points]);
	const sourceId = `${id}-track`;

	return (
		<Source data={data} id={sourceId} type="geojson">
			<Layer
				id={`${sourceId}-line`}
				layout={{ "line-cap": "round", "line-join": "round" }}
				paint={{ "line-color": color, "line-width": width }}
				type="line"
			/>
		</Source>
	);
}
