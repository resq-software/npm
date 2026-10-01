/**
 * Copyright 2026 ResQ Systems, Inc.
 * SPDX-License-Identifier: Apache-2.0
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
 * @fileoverview Canned frames in the ResQ fleet telemetry shape.
 *
 * `@resq-systems/map`'s `parseAssetFrame` reads the aliases this endpoint
 * actually emits — `drone_id` / `lat` / `lon` / `heading_deg` / `battery_pct` —
 * so frames off the shared `/fleet/ws` socket become markers without an adapter
 * in between.
 */

/** Four well-formed frames, as they arrive on the wire: raw JSON text. */
export const goodFrames: readonly string[] = [
	'{"drone_id":"DRN-004","lat":37.8044,"lon":-122.2712,"heading_deg":287,"battery_pct":92,"status":"active"}',
	'{"drone_id":"DRN-011","lat":37.7749,"lon":-122.4194,"heading_deg":411,"battery_pct":64,"status":"active"}',
	'{"drone_id":"DRN-004","lat":37.8051,"lon":-122.2744,"heading_deg":289,"battery_pct":91,"status":"active"}',
	'{"asset_id":"GND-02","latitude":37.7901,"longitude":-122.3899,"status":"charging"}',
];

/**
 * Frames `parseAssetFrame` refuses, and the one it accepts while leaving a field
 * absent. Each is a different kind of bad, and none of them is plotted anyway.
 */
export const edgeFrames: readonly { readonly why: string; readonly raw: string }[] = [
	{ raw: '{"lat":37.8044,"lon":-122.2712}', why: "no id — nothing to key a marker on" },
	{
		raw: '{"drone_id":"DRN-404","lat":800,"lon":-122.27}',
		why: "latitude 800 — refused, not clamped to 90",
	},
	{ raw: "<!doctype html>", why: "not JSON — a proxy error page, most likely" },
	{
		raw: '{"drone_id":"DRN-077","lat":37.8100,"lon":-122.4700,"battery_pct":48}',
		why: "accepted, but heading stays ABSENT — 0 is due north, a real bearing",
	},
];

/** A 50 Hz-ish burst from one asset: twelve fixes nobody could perceive separately. */
export const burstFrames: readonly string[] = Array.from({ length: 12 }, (_, index) =>
	JSON.stringify({
		battery_pct: 91 - index * 0.1,
		drone_id: "DRN-004",
		heading_deg: 289 + index * 0.4,
		lat: 37.8051 + index * 0.0004,
		lon: -122.2744 - index * 0.0006,
	}),
);

/** A long-range transit that walks across the antimeridian, west to east. */
export const pacificTransit: readonly { readonly longitude: number; readonly latitude: number }[] =
	[
		{ latitude: 51.2, longitude: 178.4 },
		{ latitude: 51.6, longitude: 179.5 },
		{ latitude: 52.0, longitude: -179.4 },
		{ latitude: 52.3, longitude: -178.2 },
	];
