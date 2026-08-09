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
 * @fileoverview Reading freshness.
 *
 * The failure a telemetry console exists to prevent is not a wrong number, it
 * is a *frozen* one that still looks live. An instrument showing a confident
 * `12.4 m` that stopped updating forty seconds ago is worse than one showing
 * nothing, because it invites a decision.
 *
 * `now` is a required argument rather than an internal `Date.now()` call. That
 * keeps this pure and testable, and it is honest about where the clock lives:
 * the instruments hold no timer, so nothing here can notice time passing on its
 * own. The application's render loop drives it, and that loop is also what
 * makes the resulting `stale` flag reach the screen.
 *
 * @module @resq-systems/ui/adapters/staleness
 */

import { optional } from "./numeric.js";

/** Milliseconds after which a reading is treated as stale by default. */
export const DEFAULT_MAX_AGE_MS = 5000;

/**
 * Whether a reading is too old to trust.
 *
 * A missing or non-finite timestamp counts as stale: an unknown age is not a
 * young one, and silently treating it as fresh is the exact failure this guards
 * against. A timestamp in the future is treated as fresh, since modest clock
 * skew between a vehicle and a console is normal and should not raise a false
 * alarm.
 *
 * @param timestamp - When the reading was taken, in epoch milliseconds.
 * @param now - Current time in epoch milliseconds, from the caller's clock.
 * @param maxAgeMs - Maximum trusted age. Defaults to {@link DEFAULT_MAX_AGE_MS}.
 *
 * @example
 * ```tsx
 * <DepthGauge {...depth} stale={isStale(frame.receivedAt, now)} />
 * ```
 */
export function isStale(
	timestamp: number | undefined,
	now: number,
	maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): boolean {
	const taken = optional(timestamp);
	if (taken === undefined) return true;

	const current = optional(now);
	if (current === undefined) return true;

	const limit = optional(maxAgeMs);
	if (limit === undefined || limit < 0) return true;

	return current - taken > limit;
}

/** Age of a reading in milliseconds, or `undefined` when it cannot be known. */
export function readingAge(timestamp: number | undefined, now: number): number | undefined {
	const taken = optional(timestamp);
	const current = optional(now);
	if (taken === undefined || current === undefined) return undefined;
	return Math.max(0, current - taken);
}
