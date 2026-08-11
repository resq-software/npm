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
 * @fileoverview Canonicalization variants — the small, bounded set of representations
 * the scanner evaluates so signatures are not trivially bypassed by encoding.
 *
 * The set is deliberately small and non-recursive. Decoding everything repeatedly
 * until it stops changing is its own bug class: it makes the scanner disagree with
 * the downstream component about what the value actually is, and it lets an attacker
 * pick whichever of several disagreeing interpretations suits them. Instead, each
 * variant is one transformation applied once, findings record which variant matched,
 * and payloads that only surface after multiple decodes get explicit rules such as
 * `PATH-TRAVERSAL-DOUBLE-ENCODED-001`.
 *
 * @module @resq-systems/security/threats/variants
 */

import type { InputVariant, InputVariantKind } from "./types.js";

//#region HTML entity decoding

/**
 * Named HTML entities worth decoding for detection purposes.
 *
 * Not a complete HTML5 entity table — there are roughly 2 200 of those — and not
 * trying to be. It covers the characters that carry syntactic meaning in the sinks
 * this package guards. Every other reference decodes to a character no rule looks
 * for, so leaving it encoded cannot hide an attack.
 */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	sol: "/",
	bsol: "\\",
	colon: ":",
	semi: ";",
	lpar: "(",
	rpar: ")",
	lbrack: "[",
	rbrack: "]",
	lcub: "{",
	rcub: "}",
	excl: "!",
	equals: "=",
	dollar: "$",
	commat: "@",
	num: "#",
	percnt: "%",
	period: ".",
	comma: ",",
	ast: "*",
	verbar: "|",
	grave: "`",
	Tab: "\t",
	NewLine: "\n",
};

/** Matches a numeric (decimal or hex) or named reference, with an optional semicolon. */
const ENTITY_PATTERN = /&(?:#[xX]([0-9a-fA-F]{1,6})|#(\d{1,7})|([a-zA-Z][a-zA-Z0-9]{1,31}));?/g;

/**
 * Highest code point `String.fromCodePoint` accepts. Numeric references above this
 * are left as written rather than throwing.
 */
const MAX_CODE_POINT = 0x10ffff;

/**
 * Decode HTML character references in a single pass.
 *
 * Handles `&#60;`, `&#x3c;`, and the named subset in {@link NAMED_ENTITIES}, with or
 * without the trailing semicolon — browsers accept several named references
 * unterminated and attackers rely on it. Unrecognized references are left verbatim;
 * this is best-effort detection support, not a rendering path.
 *
 * @param input - Raw string.
 * @returns The string with recognized references replaced.
 *
 * @example
 * ```ts
 * decodeHtmlEntities("&#60;script&#62;"); // "<script>"
 * decodeHtmlEntities("&unknownref;");     // "&unknownref;"
 * ```
 */
export function decodeHtmlEntities(input: string): string {
	if (!input.includes("&")) return input;

	// `String.prototype.replace` resets a global pattern's lastIndex on entry, so the
	// module-scoped ENTITY_PATTERN carries no state between calls.
	return input.replace(ENTITY_PATTERN, (match, hex?: string, dec?: string, name?: string) => {
		if (hex !== undefined) {
			const code = Number.parseInt(hex, 16);
			return code <= MAX_CODE_POINT ? String.fromCodePoint(code) : match;
		}
		if (dec !== undefined) {
			const code = Number.parseInt(dec, 10);
			return code <= MAX_CODE_POINT ? String.fromCodePoint(code) : match;
		}
		if (name !== undefined) {
			// Own-property check, not `?? match`: the name group matches `constructor`,
			// `toString`, `valueOf` and friends, which resolve up the prototype chain to a
			// function. `??` never fires for those, and `replace` then coerces the function
			// to its source text — `&constructor;` decoded to
			// `function Object() { [native code] }`, injecting braces and parens that trip
			// unrelated rules and corrupting the `html_decoded` variant for any input
			// carrying such a reference.
			return Object.hasOwn(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : match;
		}
		return match;
	});
}

//#endregion

//#region Percent decoding

/**
 * Percent-decode a string, tolerating malformed sequences.
 *
 * `decodeURIComponent` throws `URIError` on an invalid escape (`%zz`, a lone `%`, a
 * truncated surrogate pair). That failure is itself telemetry — well-formed clients
 * do not emit it — so the caller gets `null` and the `raw` variant stays scannable
 * instead of the whole scan aborting.
 *
 * @param input - Possibly percent-encoded string.
 * @returns The decoded string, or `null` when the input contains no `%` or is not
 *   validly encoded.
 */
export function tryPercentDecode(input: string): string | null {
	if (!input.includes("%")) return null;
	try {
		return decodeURIComponent(input);
	} catch {
		return null;
	}
}

//#endregion

//#region Variant construction

/**
 * Build the representations to scan.
 *
 * Always includes `raw`. Adds `nfc`, `percent_decoded`, and `html_decoded` only when
 * that transformation actually changes the string, so a plain ASCII value costs one
 * pass rather than four.
 *
 * The original input is never mutated or replaced — callers keep the raw value for
 * storage and display, and the variants exist solely so a rule can observe what the
 * value would become at a decoding sink.
 *
 * @param input - Raw untrusted string.
 * @returns One to four distinct representations, `raw` first.
 *
 * @example
 * ```ts
 * buildInputVariants("%2e%2e%2f");
 * // [{ kind: "raw", value: "%2e%2e%2f" }, { kind: "percent_decoded", value: "../" }]
 * ```
 */
export function buildInputVariants(input: string): readonly InputVariant[] {
	const variants: InputVariant[] = [{ kind: "raw", value: input }];
	const seen = new Set<string>([input]);

	const add = (kind: InputVariantKind, value: string): void => {
		if (seen.has(value)) return;
		seen.add(value);
		variants.push({ kind, value });
	};

	// `normalize` throws only on an invalid form argument, never on content.
	add("nfc", input.normalize("NFC"));

	// NFC is a documented no-op on compatibility characters, so fullwidth forms slipped
	// past every signature: `．．／．．／etc／passwd` and `＜script＞` both scanned clean.
	// NFKC folds U+FF01–FF5E onto ASCII, which is exactly the mapping a downstream
	// component performs when it normalizes before parsing. Kept as its own variant
	// rather than replacing `nfc`, because NFKC is lossy and must never be what the
	// caller stores.
	add("nfkc", input.normalize("NFKC"));

	const percentDecoded = tryPercentDecode(input);
	if (percentDecoded !== null) {
		add("percent_decoded", percentDecoded);
	}

	add("html_decoded", decodeHtmlEntities(input));

	return variants;
}

//#endregion
