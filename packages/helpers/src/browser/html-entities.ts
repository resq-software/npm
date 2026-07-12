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
import { type Brand, unsafeBrand } from "@resq-systems/types";

/**
 * A string whose every character has been replaced by its decimal HTML
 * character reference (e.g. `"a"` → `"&#97;"`). Produced by
 * {@link toEntities}; safe to embed as text content in HTML.
 */
export type HtmlEntityEncoded = Brand<string, "HtmlEntityEncoded">;

/**
 * Encodes every character in a string as a decimal HTML character reference.
 *
 * @param {string} str The string to encode.
 * @returns {HtmlEntityEncoded} The string with every character replaced by its HTML decimal entity.
 * @throws {TypeError} If the provided value is not a string.
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Entity
 * @see https://dev.w3.org/html5/html-author/charref
 */
const toEntities = (str: string): HtmlEntityEncoded =>
	unsafeBrand<"HtmlEntityEncoded", string>(
		str
			.split("")
			.map((c) => `&#${c.codePointAt(0)};`)
			.join(""),
	);

/**
 * Result of {@link obfuscateLink}: a RAW (un-encoded) `href` suitable for
 * an anchor's `href` attribute, paired with entity-encoded visible text.
 *
 * Note: `href` is intentionally NOT entity-encoded — browsers require a
 * literal `mailto:`/`tel:` URI in the attribute. Only `encodedText` is
 * obfuscated to deter naive scrapers of the rendered DOM.
 */
export interface ObfuscatedLink {
	/** RAW, un-encoded URI for the anchor `href` attribute. */
	href: string;
	/** Entity-encoded visible link text (see {@link HtmlEntityEncoded}). */
	encodedText: HtmlEntityEncoded;
}

/**
 * Obfuscates and encodes a contact hyperlink (such as mailto or tel).
 *
 * The returned `href` is a RAW URI (browsers need a literal `mailto:` /
 * `tel:` value in the attribute); only the visible `encodedText` is
 * entity-encoded to deter naive DOM scrapers.
 *
 * @param {Object} opts Configuration options for link obfuscation.
 * @param {'mailto'|'tel'} opts.scheme The URI scheme (`'mailto'` or `'tel'`).
 * @param {string} opts.address The contact address (email or phone number).
 * @param {Record<string, string>} [opts.params] Optional query parameters (used for mailto links).
 * @param {string} [opts.text] Optional visible link text. Defaults to address.
 * @returns {ObfuscatedLink} Object containing the RAW `href` and entity-encoded `encodedText`.
 * @throws {TypeError} If required fields are missing or invalid.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#security_and_privacy
 * @see https://github.com/resq-software/resQ
 * @example
 * ```ts
 * const { href, encodedText } = obfuscateLink({
 *   scheme: 'mailto',
 *   address: 'jane.doe@example.com',
 *   text: 'Contact Jane'
 * });
 * ```
 */
export const obfuscateLink = (opts: {
	scheme: "mailto" | "tel";
	address: string;
	params?: Record<string, string>;
	text?: string;
}): ObfuscatedLink => {
	const { scheme, address, params, text } = opts;

	let uri = `${scheme}:${address}`;

	if (params && Object.keys(params).length) {
		const qs = Object.entries(params)
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
			.join("&");
		uri += `?${qs}`;
	}

	const href = uri;
	const encodedText = toEntities(text ?? address);

	return { href, encodedText };
};
