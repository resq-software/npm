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
 * @fileoverview MQTT topic-filter matching, per MQTT 3.1.1 §4.7.
 *
 * Broker-side subscriptions are coarse — one filter can carry an entire fleet's
 * traffic — so consumers need to re-filter locally to get just their vehicle.
 * That makes this a hot path, and a pure function is the whole of it.
 *
 * @module @resq-systems/telemetry/topic-filter
 */

/** Level separator and the two wildcard tokens. */
const SEPARATOR = "/";
const SINGLE_LEVEL = "+";
const MULTI_LEVEL = "#";
/** Topics beginning with this are reserved and excluded from leading wildcards. */
const RESERVED_PREFIX = "$";

/**
 * Whether an MQTT topic name matches a topic filter.
 *
 * Implements the wildcard rules from MQTT 3.1.1 §4.7:
 *
 * - `+` matches exactly one level, and requires that level to exist.
 * - `#` matches zero or more levels but must be the final level, so `sport/#`
 *   matches `sport` as well as `sport/tennis/player1`.
 * - A filter starting with a wildcard never matches a `$`-prefixed topic, which
 *   keeps broker `$SYS` traffic out of a `#` subscription.
 *
 * A filter with a non-terminal `#` is malformed and matches nothing.
 *
 * @example
 * ```ts
 * topicMatches("uagv/v2/+/+/state", "uagv/v2/resq/AGV-7/state"); // true
 * topicMatches("#", "$SYS/broker/uptime");                       // false
 * ```
 */
export function topicMatches(filter: string, topic: string): boolean {
	if (filter === topic) return true;

	const filterLevels = filter.split(SEPARATOR);
	const topicLevels = topic.split(SEPARATOR);

	const leading = filterLevels[0];
	if (topic.startsWith(RESERVED_PREFIX) && (leading === SINGLE_LEVEL || leading === MULTI_LEVEL)) {
		return false;
	}

	for (let level = 0; level < filterLevels.length; level += 1) {
		const token = filterLevels[level];

		// '#' consumes the rest, but only when it is genuinely the last level.
		if (token === MULTI_LEVEL) return level === filterLevels.length - 1;

		// '+' still requires a level to be present to match.
		if (level >= topicLevels.length) return false;
		if (token !== SINGLE_LEVEL && token !== topicLevels[level]) return false;
	}

	return filterLevels.length === topicLevels.length;
}
