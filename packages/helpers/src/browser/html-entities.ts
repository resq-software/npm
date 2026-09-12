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
 * @fileoverview HTML-entity encoding and contact-link obfuscation: encodes text
 * as decimal character references to deter naive DOM scrapers of `mailto:` /
 * `tel:` links.
 *
 * @module @resq-systems/helpers/browser/html-entities
 */

import { type Brand, unsafeBrand } from "@resq-systems/types";

/**
 * A string whose every character has been replaced by its decimal HTML
 * character reference (e.g. `"a"` → `"&#97;"`); safe to embed as text content
 * in HTML.
 *
 * The brand guarantees the string was produced by full entity-encoding (every
 * code point escaped), not merely typed as encoded. Mint one through the
 * exported {@link obfuscateLink} — its `encodedText` field carries this brand;
 * the encoder itself is internal, so callers cannot brand an arbitrary string
 * without going through it.
 */
export type HtmlEntityEncoded = Brand<string, "HtmlEntityEncoded">;

/**
 * Encode every character in a string as a decimal HTML character reference.
 *
 * @param str - The string to encode.
 * @returns The string with every character replaced by its HTML decimal entity.
 * @throws {TypeError} If the provided value is not a string.
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Entity
 * @see https://dev.w3.org/html5/html-author/charref
 * @internal
 */
const toEntities = (str: string): HtmlEntityEncoded =>
	unsafeBrand<"HtmlEntityEncoded", string>(
		// Spread iterates by Unicode code point (not UTF-16 code unit), so
		// surrogate pairs (emoji, rare CJK) are encoded as one entity, not two.
		[...str].map((c) => `&#${c.codePointAt(0)};`).join(""),
	);

/**
 * Characters permitted in a `mailto:` or `tel:` address.
 *
 * An allowlist, because the value is interpolated into an attribute that callers place
 * directly in markup. It admits the RFC 5322 local-part atext set, the characters a
 * phone number needs (`+`, spaces, parens, hyphens), and internationalized domains and
 * names via `\p{L}\p{M}\p{N}`. It excludes the four that matter: `"` and `'` break out
 * of an attribute, `<` and `>` open a tag, and CR/LF inject headers into a compose
 * window.
 *
 * The empty string is admitted deliberately: `mailto:` with no address is useless
 * but not dangerous, and it is existing documented behaviour. Widening the guard
 * past what produces a dangerous href would be a breaking change unrelated to the
 * one being fixed. The 320-character ceiling is RFC 3696's 64-character local part,
 * a separator, and a 255-character domain.
 *
 * The set still admits `%`, `?`, `#` and `&`, which are atext and so legal in a local
 * part; {@link encodeAddress} percent-encodes them rather than this pattern rejecting
 * them, because they are only dangerous once they reach the URI.
 */
const ADDRESS_PATTERN = /^[\p{L}\p{M}\p{N}!#$%&*+\-/=?^_`{|}~.@() ]{0,320}$/u;

/**
 * Percent-encodings for the delimiters that separate a `mailto:` address from the
 * header fields after it (RFC 6068 §2). A null-prototype map, so an address containing
 * `constructor` or any other inherited key cannot resolve to something off the chain.
 */
const URI_DELIMITER_ESCAPES: Readonly<Record<string, string>> = Object.assign(
	Object.create(null) as Record<string, string>,
	{ "%": "%25", "?": "%3F", "#": "%23", "&": "%26" },
);

/**
 * Percent-encode the delimiters in an address so it stays a single opaque address.
 *
 * Without this, `victim@example.com?bcc=attacker@example.com` passes
 * {@link ADDRESS_PATTERN} — `?` is atext — and reaches the caller as a `mailto:` href
 * carrying attacker-chosen header fields, which the compose window honours. `%` is
 * encoded for the same reason and in the same pass: one pass means the `%25` this
 * produces is not itself rescanned, so a literal `%3F` in an address survives as
 * `%253F` rather than decoding into a delimiter one hop later.
 */
const encodeAddress = (address: string): string =>
	address.replace(/[%?#&]/g, (char) => URI_DELIMITER_ESCAPES[char] ?? char);

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
 * @param opts - Configuration options for link obfuscation.
 * @param opts.scheme - The URI scheme (`"mailto"` or `"tel"`).
 * @param opts.address - The contact address (email or phone number).
 * @param opts.params - Optional query parameters (used for `mailto` links).
 * @param opts.text - Optional visible link text; defaults to the address.
 * @returns An object containing the RAW `href` and entity-encoded `encodedText`.
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

	// The union guards the ordinary case at compile time, but not the ones that matter:
	// `obfuscateLink({ ...JSON.parse(config) })` type-checks clean because `JSON.parse`
	// returns `any`, and this package is published, so plain-JS consumers get no
	// enforcement at all. Without this check the returned href was `javascript:alert(1)`
	// — placed straight into an anchor by every documented usage.
	if (scheme !== "mailto" && scheme !== "tel") {
		throw new TypeError(`obfuscateLink: unsupported scheme ${String(scheme)}`);
	}

	// `params` below are percent-encoded, but `address` was interpolated raw — so
	// `x@y.com" onmouseover="alert(1)` survived verbatim into a value the docs describe
	// as ready for an anchor's `href`. A quote breaks out of the attribute, and CR/LF
	// injects headers into a `mailto:` compose window.
	if (typeof address !== "string" || !ADDRESS_PATTERN.test(address)) {
		throw new TypeError("obfuscateLink: address contains characters that are not allowed");
	}

	let uri = `${scheme}:${encodeAddress(address)}`;

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
