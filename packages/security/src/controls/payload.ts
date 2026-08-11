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
 * @fileoverview Structural bounds on a JSON payload, measured from the text before
 * anything parses it (OWASP API Security API4 — unrestricted resource consumption).
 *
 * @module @resq-systems/security/controls/payload
 */

//#region Types

/** Bounds for {@link checkJsonPayloadLimits}. */
export interface JsonPayloadLimits {
	/** Deepest container nesting. Defaults to 100. */
	readonly maxDepth?: number;
	/** Most entries in any single array. Defaults to 10 000. */
	readonly maxArrayLength?: number;
	/** Most keys in any single object. Defaults to 2 000. */
	readonly maxObjectKeys?: number;
	/** Longest single string value, in characters. Defaults to 1 000 000. */
	readonly maxStringLength?: number;
	/** Longest payload overall, in characters. Defaults to 5 000 000. */
	readonly maxLength?: number;
}

/** Result of {@link checkJsonPayloadLimits}. */
export interface JsonPayloadReport {
	/** Deepest container nesting reached. */
	readonly depth: number;
	/** Largest array seen, by entry count. */
	readonly arrayLength: number;
	/** Largest object seen, by key count. */
	readonly objectKeys: number;
	/** Longest string value seen. */
	readonly stringLength: number;
	/** Character length of the payload. */
	readonly length: number;
	/** `true` when every bound is satisfied. */
	readonly withinLimits: boolean;
	/** Names of the bounds exceeded; empty when `withinLimits`. */
	readonly exceeded: readonly string[];
}

//#endregion

//#region Implementation

/**
 * Defaults sized from real payloads rather than from what looks tidy.
 *
 * An earlier draft used 20/1000/200/10k/1M and rejected four of five ordinary bodies: a
 * 250-key dependency manifest, a 25-deep config tree, a 40 KB data-URI avatar and a
 * 2000-row page. These are backstops against a payload built to exhaust memory, not a
 * schema — a body that trips one of them is pathological rather than merely large.
 */
const DEFAULT_LIMITS = {
	maxDepth: 100,
	maxArrayLength: 10_000,
	maxObjectKeys: 2_000,
	maxStringLength: 1_000_000,
	maxLength: 5_000_000,
} as const satisfies Required<JsonPayloadLimits>;

/**
 * Cap on the per-container counter stack.
 *
 * Without it, a payload nested 200 000 deep grows 200 000 entries of scanner state — the
 * same unbounded allocation this function exists to prevent, moved one layer down. Depth
 * is still counted past the cap; only per-container entry counts stop being tracked, and
 * a payload that deep has already exceeded `maxDepth` by a wide margin.
 */
const MAX_COUNTER_STACK = 512;

/**
 * Measure a JSON payload's structure without parsing it.
 *
 * `JSON.parse` allocates the whole object graph before a caller can inspect anything, so
 * a body designed to exhaust memory has already succeeded by the time validation runs.
 * This is one linear pass over the *text*: it counts nesting, container sizes and string
 * lengths, and never builds a value.
 *
 * Reporting rather than enforcing, deliberately. It returns what it measured and which
 * bounds were exceeded; the caller decides. Schema validation remains the real control
 * for shape — this only bounds the cost of getting there.
 *
 * Malformed JSON is not diagnosed. The scanner is a bracket counter, so an invalid or
 * truncated payload yields whatever it measured before running out; use `JSON.parse` for
 * validity, once this has bounded the cost.
 *
 * @param text - The raw JSON text, before parsing.
 * @param limits - See {@link JsonPayloadLimits}.
 * @returns The measured {@link JsonPayloadReport}. Never throws.
 *
 * @example
 * ```ts
 * const report = checkJsonPayloadLimits(await request.text());
 * if (!report.withinLimits) {
 *   return new Response(`Payload rejected: ${report.exceeded.join(", ")}`, { status: 413 });
 * }
 * ```
 */
export function checkJsonPayloadLimits(
	text: string,
	limits: JsonPayloadLimits = {},
): JsonPayloadReport {
	const { maxDepth, maxArrayLength, maxObjectKeys, maxStringLength, maxLength } = {
		...DEFAULT_LIMITS,
		...limits,
	};

	if (typeof text !== "string") {
		return {
			depth: 0,
			arrayLength: 0,
			objectKeys: 0,
			stringLength: 0,
			length: 0,
			withinLimits: true,
			exceeded: [],
		};
	}

	let depth = 0;
	let deepest = 0;
	let arrayLength = 0;
	let objectKeys = 0;
	let stringLength = 0;

	/** Entry counts for the containers currently open, innermost last. */
	const counters: { isArray: boolean; count: number }[] = [];
	let inString = false;
	let escaped = false;
	let stringStart = 0;
	/** Whether the innermost container has seen content since the last comma. */
	let sawContent = false;

	for (let index = 0; index < text.length; index++) {
		const char = text[index];

		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === '"') {
				inString = false;
				const measured = index - stringStart;
				if (measured > stringLength) stringLength = measured;
			}
			continue;
		}

		if (char === '"') {
			inString = true;
			stringStart = index + 1;
			sawContent = true;
			continue;
		}

		if (char === "{" || char === "[") {
			depth++;
			if (depth > deepest) deepest = depth;
			if (counters.length < MAX_COUNTER_STACK) {
				counters.push({ isArray: char === "[", count: 0 });
			}
			sawContent = false;
			continue;
		}

		if (char === "}" || char === "]") {
			const container = counters.pop();
			if (container !== undefined) {
				// A container holding any content has one more entry than it has commas.
				const entries = sawContent || container.count > 0 ? container.count + 1 : 0;
				if (container.isArray) {
					if (entries > arrayLength) arrayLength = entries;
				} else if (entries > objectKeys) {
					objectKeys = entries;
				}
			}
			depth = Math.max(0, depth - 1);
			sawContent = true;
			continue;
		}

		if (char === ",") {
			const container = counters[counters.length - 1];
			if (container !== undefined) container.count++;
			sawContent = false;
			continue;
		}

		if (char !== undefined && char !== ":" && char.trim().length > 0) sawContent = true;
	}

	const exceeded: string[] = [];
	if (deepest > maxDepth) exceeded.push("depth");
	if (arrayLength > maxArrayLength) exceeded.push("arrayLength");
	if (objectKeys > maxObjectKeys) exceeded.push("objectKeys");
	if (stringLength > maxStringLength) exceeded.push("stringLength");
	if (text.length > maxLength) exceeded.push("length");

	return {
		depth: deepest,
		arrayLength,
		objectKeys,
		stringLength,
		length: text.length,
		withinLimits: exceeded.length === 0,
		exceeded,
	};
}

//#endregion
