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
 * @fileoverview Public API for `@resq-systems/map` — MapLibre + react-map-gl
 * telemetry primitives: a themeable map shell, asset markers, track layers, and
 * a hook that binds `@resq-systems/telemetry` frames to live positions.
 *
 * `maplibre-gl`, `react-map-gl`, `react`, and `react-dom` are peers; import
 * `maplibre-gl/dist/maplibre-gl.css` once in your app. `useAssetPositions`
 * additionally requires `@resq-systems/telemetry` and a `<TelemetryProvider>`.
 *
 * @module @resq-systems/map
 */

export { type Asset, parseAssetFrame } from "./asset.js";
export { AssetMarker, type AssetMarkerProps } from "./asset-marker.js";
export { DEFAULT_MAP_STYLE_URL, resolveMapStyle } from "./map-style.js";
export { TelemetryMap, type TelemetryMapProps } from "./telemetry-map.js";
export { type LngLat, toTrackGeoJSON } from "./track.js";
export { TrackLayer, type TrackLayerProps } from "./track-layer.js";
export { type AssetPositions, useAssetPositions } from "./use-asset-positions.js";
