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
 * @fileoverview Parse a telemetry frame into a positional {@link Asset}.
 *
 * Field aliases match the ResQ fleet telemetry shape (`drone_id`/`lat`/`lon`/
 * `heading_deg`/…), so frames from the shared `/fleet/ws` socket map directly to
 * markers. Frames without an id or a finite position are dropped (returns null).
 *
 * @module @resq-systems/map/asset
 */

/** A positional entity to place on the map. */
export interface Asset {
	/** Stable identifier. */
	id: string;
	/** Longitude in degrees. */
	longitude: number;
	/** Latitude in degrees. */
	latitude: number;
	/** Heading in degrees, clockwise from north (0 when unknown). */
	heading: number;
	/** Altitude, when present. */
	altitude?: number;
	/** Battery percentage, when present. */
	battery?: number;
	/** Free-form status, when present. */
	status?: string;
}

type Frame = Record<string, unknown>;

/** First finite number found across `keys`, else `undefined`. */
function readNumber(frame: Frame, keys: readonly string[]): number | undefined {
	for (const key of keys) {
		const value = frame[key];
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string" && value.trim() !== "") {
			const parsed = Number(value);
			if (Number.isFinite(parsed)) return parsed;
		}
	}
	return undefined;
}

/** First non-empty string found across `keys`, else `undefined`. */
function readString(frame: Frame, keys: readonly string[]): string | undefined {
	for (const key of keys) {
		const value = frame[key];
		if (typeof value === "string" && value.trim() !== "") return value;
		if (typeof value === "number" && Number.isFinite(value)) return String(value);
	}
	return undefined;
}

/** Coerce a raw frame (JSON string or object) to a `Frame`, or null. */
function toFrame(raw: string | Frame): Frame | null {
	if (typeof raw === "string") {
		try {
			const parsed: unknown = JSON.parse(raw);
			return typeof parsed === "object" && parsed !== null ? (parsed as Frame) : null;
		} catch {
			return null;
		}
	}
	return typeof raw === "object" && raw !== null ? raw : null;
}

/**
 * Parse a telemetry frame into an {@link Asset}, or `null` when it lacks an id
 * or a finite position.
 *
 * @example
 * ```ts
 * parseAssetFrame('{"drone_id":"UNIT-1","lat":38.9,"lon":-77,"heading_deg":120}');
 * // → { id: "UNIT-1", latitude: 38.9, longitude: -77, heading: 120 }
 * ```
 */
export function parseAssetFrame(raw: string | Frame): Asset | null {
	const frame = toFrame(raw);
	if (frame === null) return null;

	const id = readString(frame, ["drone_id", "id", "asset_id"]);
	if (id === undefined) return null;

	const longitude = readNumber(frame, ["lon", "lng", "longitude"]);
	const latitude = readNumber(frame, ["lat", "latitude"]);
	if (longitude === undefined || latitude === undefined) return null;

	const asset: Asset = {
		heading: readNumber(frame, ["heading_deg", "heading"]) ?? 0,
		id,
		latitude,
		longitude,
	};

	const altitude = readNumber(frame, ["alt", "altitude"]);
	if (altitude !== undefined) asset.altitude = altitude;
	const battery = readNumber(frame, ["battery_pct", "battery"]);
	if (battery !== undefined) asset.battery = battery;
	const status = readString(frame, ["status"]);
	if (status !== undefined) asset.status = status;

	return asset;
}
