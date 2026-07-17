/**
 * Copyright 2025 GDG on Campus Farmingdale State College
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
 * @fileoverview Type helpers for the Picture component — prop-merging utilities
 * and the LQIP (low-quality image placeholder) registry shapes its `lqip` prop
 * accepts.
 *
 * @module @resq-systems/ui/components/picture/types
 */

/**
 * `T` with any keys also present in `U` replaced by `U`'s versions.
 *
 * Used to layer the Picture-specific props (`U`) over a host element's props
 * (`T`), letting the component's own typings win on any name collision.
 *
 * @template T - The base shape whose colliding members are dropped.
 * @template U - The overriding shape; its members are kept as-is.
 */
export type Overwrite<T, U> = Omit<T, keyof U> & U;

/**
 * Like `Omit<T, K>`, but distributes over a union so each member is stripped
 * independently — `Omit` on a union would collapse to the shared keys and lose
 * per-variant properties.
 *
 * @template T - The (possibly union) shape to omit from.
 * @template K - The property key(s) to remove from every union member.
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A single entry from the LQIP registry (design/assets/lqip.json). */
export interface LqipEntry {
	/** Base64 data-URL of the low-quality placeholder. */
	readonly lqip: string;
	/** Relative path to the source image. */
	readonly path: string;
	/** Stem of the filename (no extension, no directory). */
	readonly src: string;
	/** Placeholder width in pixels. */
	readonly width: number;
	/** Placeholder height in pixels. */
	readonly height: number;
}

/**
 * Accepted value for the Picture `lqip` prop.
 * - `string` — a raw base64 data-URL.
 * - `LqipEntry` — an entry from the registry (the `lqip` field is extracted automatically).
 */
export type LqipValue = string | LqipEntry;
