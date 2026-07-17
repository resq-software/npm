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
 * @fileoverview Non-throwing URL parsing: wraps the `URL` constructor and
 * returns `undefined` instead of throwing on invalid input.
 *
 * @module @resq-systems/helpers/browser/url
 */

/**
 * Safely parse a URL string, returning `undefined` instead of throwing on
 * invalid input.
 *
 * @param url - The URL string to parse.
 * @param baseUrl - Optional base URL to resolve relative URLs against.
 * @returns A `URL` object if parsing succeeds, or `undefined` if it fails.
 *
 * @example
 * ```ts
 * // Valid absolute URL
 * const url1 = safeParseUrl('https://example.com')
 * if (url1) {
 *   console.log(`Valid URL: ${url1.href}`) // "Valid URL: https://example.com/"
 * }
 *
 * // Invalid URL
 * const url2 = safeParseUrl('not-a-url')
 * console.log(url2) // undefined
 *
 * // Relative URL with base
 * const url3 = safeParseUrl('/path', 'https://example.com')
 * if (url3) {
 *   console.log(url3.href) // "https://example.com/path"
 * }
 *
 * // Error handling
 * function handleUserUrl(input: string) {
 *   const url = safeParseUrl(input)
 *   if (url) {
 *     return url
 *   } else {
 *     console.log('Invalid URL provided')
 *     return null
 *   }
 * }
 * ```
 */
export function safeParseUrl(url: string, baseUrl?: string | URL) {
	try {
		return new URL(url, baseUrl);
	} catch {
		return;
	}
}
