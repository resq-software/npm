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
 * Upper-case the first character of a string and leave the rest
 * unchanged. ASCII-aware; for full Unicode title-casing use
 * `Intl.Segmenter` plus locale-aware case mapping.
 *
 * @param str - Input string. Empty input returns `""`.
 * @returns The string with its first character upper-cased.
 *
 * @example
 * ```ts
 * capitalize("hello");      // → "Hello"
 * capitalize("hELLO");      // → "HELLO" (only first char changes)
 * capitalize("");           // → ""
 * ```
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a string to at most `length` characters, appending `"..."`
 * when truncated. The ellipsis is **additive** — the returned string
 * may be `length + 3` characters long when truncation occurs.
 *
 * Operates on UTF-16 code units, so emoji and other surrogate-pair
 * code points may be split. Use `Intl.Segmenter` if you need
 * grapheme-cluster-safe truncation.
 *
 * @param str - Input string.
 * @param length - Maximum number of code units to keep before
 *   appending the ellipsis.
 *
 * @returns The original string when it fits, or `str.slice(0, length)
 *   + "..."`.
 *
 * @example
 * ```ts
 * truncate("hello world", 5); // → "hello..."
 * truncate("hi", 5);          // → "hi"
 * ```
 */
export function truncate(str: string, length: number): string {
	if (str.length <= length) return str;
	return `${str.slice(0, length)}...`;
}

/**
 * Convert an arbitrary string into a URL-safe slug — lower-cased,
 * non-word characters removed, runs of spaces collapsed to single
 * hyphens.
 *
 * Strips anything outside `[A-Za-z0-9_]` (and space). Diacritics are
 * removed rather than transliterated; for transliteration (`é → e`)
 * normalize the input first with `str.normalize("NFKD")` and strip
 * combining marks before passing in.
 *
 * @param str - Input string (typically a title or human-entered name).
 * @returns Lower-case kebab-style slug.
 *
 * @example
 * ```ts
 * slugify("Hello, World!");     // → "hello-world"
 * slugify("  foo   bar  ");     // → "-foo-bar-"  (leading/trailing spaces preserved as hyphens)
 * slugify("Action: 2026 Plan"); // → "action-2026-plan"
 * ```
 */
export function slugify(str: string): string {
	return str
		.toLowerCase()
		.replaceAll(/[^\w ]+/g, "")
		.replaceAll(/ +/g, "-");
}
