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

/*!
 * Adapted from Microsoft Playwright — packages/isomorphic/stringUtils.ts (subset).
 * https://github.com/microsoft/playwright
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * @file General string escaping, casing, normalization, and truncation helpers.
 * @module @resq-systems/helpers/string-utils
 */

/**
 * Quote and escape `text` with the given quote character (`'`, `"`, or `` ` ``).
 *
 * NOTE: this is not safe for building CSS/DOM selectors.
 *
 * @throws If `char` is not one of `'`, `"`, `` ` ``.
 */
export function escapeWithQuotes(text: string, char = "'"): string {
	const stringified = JSON.stringify(text);
	const escapedText = stringified.substring(1, stringified.length - 1).replace(/\\"/g, '"');
	if (char === "'") return char + escapedText.replace(/[']/g, "\\'") + char;
	if (char === '"') return char + escapedText.replace(/["]/g, '\\"') + char;
	if (char === "`") return char + escapedText.replace(/[`]/g, "\\`") + char;
	throw new Error("Invalid escape char");
}

/** Escape a string for safe interpolation inside a template literal. */
export function escapeTemplateString(text: string): string {
	return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/** Upper-case the first character, leaving the rest untouched. */
export function toTitleCase(name: string): string {
	return name.charAt(0).toUpperCase() + name.substring(1);
}

/** Convert `camelCase`/`PascalCase` to `snake_case` (e.g. `ignoreHTTPSErrors` → `ignore_https_errors`). */
export function toSnakeCase(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
		.toLowerCase();
}

/** Strip zero-width/soft-hyphen characters, trim, and collapse runs of whitespace to a single space. */
export function normalizeWhiteSpace(text: string): string {
	return text
		.replace(/[\u200b\u00ad]/g, "")
		.trim()
		.replace(/\s+/g, " ");
}

/** Truncate `input` to `cap` code points, appending `suffix` when truncated. */
export function trimString(input: string, cap: number, suffix = ""): string {
	if (input.length <= cap) return input;
	const chars = [...input];
	if (chars.length > cap) return chars.slice(0, cap - suffix.length).join("") + suffix;
	return chars.join("");
}

/** Truncate `input` to `cap` code points, appending an ellipsis (`…`) when truncated. */
export function trimStringWithEllipsis(input: string, cap: number): string {
	return trimString(input, cap, "…");
}

/**
 * Collapse a `data:` URL to its media-type prefix + `…`, dropping the (often
 * huge) base64 payload. Non-data URLs are returned unchanged.
 */
export function truncateDataUrl(url: string): string {
	if (!url.startsWith("data:")) return url;
	const comma = url.indexOf(",");
	if (comma === -1) return url;
	return `${url.slice(0, comma + 1)}…`;
}

/** Escape a string so it can be used literally inside a `RegExp`. */
export function escapeRegExp(s: string): string {
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/** Escape a string for use inside a double/single-quoted HTML attribute value. */
export function escapeHTMLAttribute(s: string): string {
	return s.replace(/[&<>"']/gu, (char) => HTML_ESCAPES[char] ?? char);
}

/** Escape a string for use in HTML text content (`&` and `<`). */
export function escapeHTML(s: string): string {
	return s.replace(/[&<]/gu, (char) => HTML_ESCAPES[char] ?? char);
}
