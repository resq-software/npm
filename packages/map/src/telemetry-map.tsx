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
 * @fileoverview TelemetryMap — a thin react-map-gl + MapLibre shell with a
 * token-free dark basemap by default (override via `mapStyle`). Mission
 * entities (markers, sources, layers) render as children inside the map.
 *
 * @module @resq-systems/map/telemetry-map
 */

"use client";

import type { CSSProperties, ReactNode } from "react";
import { Map as MapGL } from "react-map-gl/maplibre";

import { resolveMapStyle } from "./map-style.js";

/** Fill the positioned parent by default. */
const FILL_PARENT: CSSProperties = { inset: 0, position: "absolute" };

export interface TelemetryMapProps {
	/** Basemap style URL; falls back to a token-free dark basemap. */
	mapStyle?: string;
	/** Initial camera. */
	initialViewState?: { longitude: number; latitude: number; zoom: number };
	/** Disable pan/zoom for a static display. */
	interactive?: boolean;
	/** CSS cursor over the canvas. */
	cursor?: string;
	/** Map click handler. */
	onClick?: (event: { lngLat: { lng: number; lat: number } }) => void;
	/** Container style; defaults to filling the positioned parent. */
	style?: CSSProperties;
	/** Markers, sources, and layers. */
	children?: ReactNode;
}

/**
 * Dark telemetry basemap shell.
 *
 * @example
 * ```tsx
 * <div style={{ position: "relative", height: 480 }}>
 *   <TelemetryMap initialViewState={{ longitude: -98.5, latitude: 39.8, zoom: 3.6 }}>
 *     <AssetMarker asset={asset} />
 *   </TelemetryMap>
 * </div>
 * ```
 */
export function TelemetryMap({
	mapStyle,
	initialViewState,
	interactive,
	cursor,
	onClick,
	style,
	children,
}: Readonly<TelemetryMapProps>) {
	return (
		<MapGL
			cursor={cursor}
			initialViewState={initialViewState}
			interactive={interactive}
			mapStyle={resolveMapStyle(mapStyle)}
			onClick={onClick}
			style={style ?? FILL_PARENT}
		>
			{children}
		</MapGL>
	);
}
