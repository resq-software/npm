/**
 * Copyright 2026 ResQ
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
 * @fileoverview Deduplicated warnings — `warnOnce` logs a message a single time via
 * the structured logger, and `warnDeprecatedGetter` builds a standard
 * getter-deprecation message.
 *
 * @module @resq-systems/helpers/utils/warn
 */

import { Logger } from "@resq-systems/logger";

const logger = Logger.getLogger("helpers");
const usedWarnings = new Set<string>();

/**
 * Issues a deprecation warning for deprecated getter properties, advising users to use
 * the equivalent getter method instead. The warning is shown only once per property name.
 *
 * Delegates to {@link warnOnce}, so it inherits the same logger side effect and
 * process-lifetime dedup: the composed message (which suggests `get<Name>`) is
 * logged at most once.
 *
 * @param name - The name of the deprecated property (e.g., 'viewport')
 *
 * @example
 * ```ts
 * // Inside a class with deprecated property access
 * get viewport() {
 *   warnDeprecatedGetter('viewport')
 *   return this.getViewport()
 * }
 *
 * // Usage will show: "[helpers] Using 'viewport' is deprecated and will be removed..."
 * // But only the first time it's accessed
 * ```
 *
 * @internal
 */
export function warnDeprecatedGetter(name: string) {
	warnOnce(
		`Using '${name}' is deprecated and will be removed in the near future. Please refactor to use 'get${name[0].toLocaleUpperCase()}${name.slice(
			1,
		)}' instead.`,
	);
}

/**
 * Issues a warning message to the console, but only once per unique message.
 * Subsequent calls with the same message are ignored, preventing console spam.
 * All messages are logged using the resq structured logger under the "helpers" context.
 *
 * Effects: writes through the shared `helpers` logger and records `message` in a
 * module-global set of already-seen strings. Dedup is by exact string equality and
 * persists for the process lifetime (never cleared), so a message logs at most
 * once; repeat calls with the same string are no-ops.
 *
 * @param message - The warning message to display
 *
 * @example
 * ```ts
 * // Warn about deprecated usage
 * function oldFunction() {
 *   warnOnce('oldFunction is deprecated, use newFunction instead')
 *   // Continue with implementation...
 * }
 *
 * // First call logs warning
 * oldFunction() // Shows warning
 * oldFunction() // No warning (already shown)
 * oldFunction() // No warning (already shown)
 * ```
 *
 * @internal
 */
export function warnOnce(message: string) {
	if (usedWarnings.has(message)) return;

	usedWarnings.add(message);
	logger.warn(message);
}
