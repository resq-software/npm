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

import type { NumberRange } from "@resq-systems/types";

/**
 * A single 8-bit color channel: an integer in the **inclusive** range `0–255`.
 *
 * Modeled with {@link NumberRange} so the compiler rejects out-of-gamut literals
 * (`{ r: 256 }` is a type error), while any parsed value is normalized through
 * a channel constructor at the boundary.
 */
export type Channel = NumberRange<0, 255>;

/**
 * A parsed, in-gamut RGB triple.
 *
 * Fallibility is expressed at the boundary — parsers return `Rgb | null` — not
 * baked into this type. A value of type `Rgb` is therefore always a valid color,
 * so downstream code never has to re-check for `null`.
 */
export interface Rgb {
	readonly r: Channel;
	readonly g: Channel;
	readonly b: Channel;
}

/**
 * @deprecated Prefer {@link Rgb} for a definitely-valid color and express the
 * parse-failure state as `Rgb | null` at each boundary. Retained as an alias for
 * backwards compatibility.
 */
export type RGB = Rgb | null;
