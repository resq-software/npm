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
 * @fileoverview Formats a code-location string (file path, entity name, and
 * caller-supplied context) for debugging, developer logging, and traceability.
 *
 * @module @resq-systems/helpers/parse-code-path
 */

//#region Public API

/**
 * Build a formatted string describing a code location: the file path, the
 * associated entity name (function, class, instance, string, or symbol), and a
 * human-readable context.
 *
 * Useful for debugging, developer logging, and traceability.
 *
 * Effectively non-throwing for ordinary entities: {@link getFilePath} swallows
 * any stack-trace parse failure and falls back to a sentinel path, and
 * {@link extractEntityName} handles every input kind. Reads the current call
 * stack / `__filename` but has no side effects.
 *
 * @param context - A description, situation, or custom value relevant to this code path.
 * @param entity - The entity whose name is included: a function, class, or instance, a string, or a symbol.
 * @returns A formatted string of the form `"location: <path> @<entity>: <context>"`.
 *   When the location cannot be determined, `<path>` degrades to
 *   `"unknown-location"` rather than the call failing.
 * @example
 * ```ts
 * function myFunction() {}
 * parseCodePath("initialization", myFunction);
 * // → "location: /current/dir/file.js @myFunction: initialization"
 *
 * class MyClass {}
 * parseCodePath("instantiating MyClass", MyClass);
 * // → "location: ... @MyClass: instantiating MyClass"
 *
 * parseCodePath("some context", "EntityAsString");
 * // → "location: ... @EntityAsString: some context"
 * ```
 * @see {@link parseCodePathDetailed}
 */
export const parseCodePath = (
	context: string | number,
	entity: object | string | symbol,
): string => {
	const entityName = extractEntityName(entity);
	const filePath = getFilePath();

	return `location: ${filePath} @${entityName}: ${context}`;
};

//#endregion

//#region Internal

/**
 * Extract a standardized name from an entity, supporting functions, classes,
 * instances, symbols, and strings.
 *
 * - For functions or classes, returns the `name` or `"AnonymousFunction"`.
 * - For instances, extracts the class/constructor name.
 * - For string entities, returns the string itself.
 * - For symbols, returns their string representation.
 * - Returns `"UnknownEntity"` if no name is found.
 *
 * @param entity - The entity to extract a name from.
 * @returns The extracted name, or `"UnknownEntity"` if not determinable.
 * @example
 * ```ts
 * extractEntityName(function test() {}); // → "test"
 * extractEntityName(class MyClass {});   // → "MyClass"
 * extractEntityName("ManualName");       // → "ManualName"
 * extractEntityName(Symbol("sym"));      // → "Symbol(sym)"
 * ```
 * @internal
 */
function extractEntityName(entity: unknown): string {
	if (typeof entity === "function") {
		return entity.name || "AnonymousFunction";
	}
	if (typeof entity === "object" && entity !== null) {
		const entityConstructor = (entity as { constructor?: unknown }).constructor;
		if (typeof entityConstructor === "function" && entityConstructor.name) {
			return entityConstructor.name;
		}
	}
	if (typeof entity === "string") {
		return entity;
	}
	if (typeof entity === "symbol") {
		return entity.toString();
	}
	return "UnknownEntity";
}

/**
 * Determine the current file path in both Node.js and browser-like
 * environments. Uses `__filename` when available (Node), otherwise parses the
 * call stack, and falls back to `process.cwd()` or `"unknown-location"`.
 *
 * @returns The current file path, URL, or `"unknown-location"`.
 * @example
 * ```ts
 * getFilePath(); // → "/Users/user/project/src/utils/formatting/parse-code-path.js"
 * ```
 * @internal
 */
function getFilePath(): string {
	try {
		if (typeof __filename !== "undefined") {
			return __filename;
		}
		const stack = new Error("Stack trace for file path extraction").stack;
		if (stack) {
			const stackLine = stack.split("\n")[2]; // Get caller's line
			if (stackLine) {
				const match =
					/https?:\/\/[^)]+/.exec(stackLine) ||
					/file:\/\/[^)]+/.exec(stackLine) ||
					/at\s+(.+):\d+:\d+/.exec(stackLine);
				if (match) {
					return match[1] || match[0];
				}
			}
		}
		return process?.cwd?.() || "unknown-location";
	} catch {
		return "unknown-location";
	}
}

//#endregion

//#region Detailed Public API

/**
 * Build a detailed code-location string with optional line number, ISO
 * timestamp, and a custom prefix. Useful for enhanced debugging or audit logs.
 *
 * Effectively non-throwing: line-number extraction is wrapped in its own
 * try/catch and {@link getFilePath} never throws. When `includeTimestamp` is
 * set the output reads the clock (`new Date()`), so the result is
 * **non-deterministic** across calls; `includeLineNumber` likewise varies with
 * the call site.
 *
 * @param context - Context description of the operation or location.
 * @param entity - The entity whose name is included: a function, class, or instance, a string, or a symbol.
 * @param options - Optional configuration for the output string.
 * @param options.includeLineNumber - When true, appends the call-site line number; silently omitted if the stack cannot be parsed.
 * @param options.includeTimestamp - When true, appends a live ISO 8601 timestamp (makes output time-dependent).
 * @param options.customPrefix - Prefix to use instead of the default `"location"`.
 * @returns The detailed formatted location string.
 * @example
 * ```ts
 * parseCodePathDetailed("init", MyClass, { includeLineNumber: true, includeTimestamp: true });
 * // → "location: ...:42 [2024-06-01T08:00:00.000Z] @MyClass: init"
 * ```
 * @see {@link parseCodePath}
 */
export const parseCodePathDetailed = (
	context: string | number,
	entity: object | string | symbol,
	options: {
		includeLineNumber?: boolean;
		includeTimestamp?: boolean;
		customPrefix?: string;
	} = {},
): string => {
	const entityName = extractEntityName(entity);
	const filePath = getFilePath();
	const prefix = options.customPrefix || "location";

	let locationInfo = `${prefix}: ${filePath}`;

	if (options.includeLineNumber) {
		try {
			const stack = new Error("Stack trace for line number extraction").stack;
			const callerLine = stack?.split("\n")[2];
			const lineMatch = callerLine?.match(/:(\d+):\d+/);
			if (lineMatch) {
				locationInfo += `:${lineMatch[1]}`;
			}
		} catch {
			// Ignore errors in line number extraction
		}
	}

	if (options.includeTimestamp) {
		locationInfo += ` [${new Date().toISOString()}]`;
	}

	return `${locationInfo} @${entityName}: ${context}`;
};

//#endregion
