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
 * @fileoverview Numeric helpers shared by the protocol adapters.
 *
 * `clamp` duplicates the one in
 * {@link module:@resq-systems/ui/lib/instrument-dial} on purpose. Importing that
 * module here would pull component-layer code into the adapters bundle, and the
 * point of the separate `./adapters` entry point is that it depends on nothing
 * but itself — no React, no components, no transport. Three lines is a cheap
 * price for keeping that boundary real rather than merely documented.
 *
 * @module @resq-systems/ui/adapters/numeric
 */

/**
 * A finite number, or `undefined` when the input is absent or non-finite.
 *
 * Absent readings must stay absent rather than collapsing to 0: the instruments
 * these adapters feed draw a blank readout for `undefined` and a real value for
 * `0`, so conflating the two would invent telemetry.
 */
export function optional(value: number | undefined): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Clamp `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
