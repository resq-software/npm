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
 * @fileoverview UTS #39 identifier security: script analysis, mixed-script detection,
 * restriction levels, and invisible/bidirectional control detection.
 *
 * **Scope matters more here than anywhere else in this package.** UTS #39 itself warns
 * that broad confusable detection flags a great many legitimate strings. These
 * functions belong on *protected identifiers* — usernames, domain names, organization
 * names, package names, brand-adjacent labels — where a visual collision is the whole
 * attack. They do not belong on prose, on postal addresses, and emphatically not on
 * people's names: "Ольга Иванова" is single-script Cyrillic, and rejecting it is not a
 * security control, it is a bug. Use `validatePersonName` for names.
 *
 * The one exception is {@link containsBidiControls}, which is safe to apply anywhere:
 * a bidirectional override in user input is the "Trojan Source" class (CVE-2021-42574)
 * and has no legitimate use in a stored field.
 *
 * @module @resq-systems/security/unicode
 */

import { getSkeleton } from "./confusables.js";

export {
	areConfusable,
	CONFUSABLE_MAP,
	foldConfusables,
	getSkeleton,
} from "./confusables.js";

//#region Scripts

/**
 * Scripts the analyzer distinguishes.
 *
 * Not the full ISO 15924 list — it covers the scripts that actually appear in
 * identifier-spoofing work, plus the CJK set needed to model UTS #39's Highly
 * Restrictive level correctly.
 */
export type UnicodeScript =
	| "Latin"
	| "Greek"
	| "Cyrillic"
	| "Armenian"
	| "Hebrew"
	| "Arabic"
	| "Devanagari"
	| "Bengali"
	| "Tamil"
	| "Thai"
	| "Georgian"
	| "Han"
	| "Hiragana"
	| "Katakana"
	| "Hangul"
	| "Bopomofo"
	| "Cherokee"
	| "Other";

/**
 * Detectors keyed by script.
 *
 * `Script_Extensions` rather than `Script`: a character shared between scripts — the
 * Japanese iteration mark, say — should count for every script that uses it rather
 * than being forced into one. That is precisely what keeps ordinary Japanese from
 * scoring as mixed-script.
 */
const SCRIPT_PATTERNS: readonly (readonly [UnicodeScript, RegExp])[] = [
	["Latin", /\p{Script_Extensions=Latin}/u],
	["Greek", /\p{Script_Extensions=Greek}/u],
	["Cyrillic", /\p{Script_Extensions=Cyrillic}/u],
	["Armenian", /\p{Script_Extensions=Armenian}/u],
	["Hebrew", /\p{Script_Extensions=Hebrew}/u],
	["Arabic", /\p{Script_Extensions=Arabic}/u],
	["Devanagari", /\p{Script_Extensions=Devanagari}/u],
	["Bengali", /\p{Script_Extensions=Bengali}/u],
	["Tamil", /\p{Script_Extensions=Tamil}/u],
	["Thai", /\p{Script_Extensions=Thai}/u],
	["Georgian", /\p{Script_Extensions=Georgian}/u],
	["Han", /\p{Script_Extensions=Han}/u],
	["Hiragana", /\p{Script_Extensions=Hiragana}/u],
	["Katakana", /\p{Script_Extensions=Katakana}/u],
	["Hangul", /\p{Script_Extensions=Hangul}/u],
	["Bopomofo", /\p{Script_Extensions=Bopomofo}/u],
	["Cherokee", /\p{Script_Extensions=Cherokee}/u],
];

/**
 * Characters belonging to no specific script — digits, punctuation, spaces, symbols,
 * format and control codes. Removed before analysis, since `user.name-1` is not
 * mixed-script.
 */
const SCRIPT_NEUTRAL = /[\p{White_Space}\p{P}\p{S}\p{N}\p{Cf}\p{Cc}]/gu;

/**
 * Identify the scripts present in a string.
 *
 * Script-neutral characters are ignored, so `alice-99` reports `["Latin"]` rather
 * than mixing in a phantom numeric script.
 *
 * @param input - String to analyze.
 * @returns Scripts present, in {@link SCRIPT_PATTERNS} order. Includes `"Other"` when
 *   characters remain that match no known detector; `[]` for an entirely
 *   script-neutral string.
 *
 * @example
 * ```ts
 * getScripts("paypal");    // ["Latin"]
 * getScripts("pаypal");    // ["Latin", "Cyrillic"]  ← the spoof
 * getScripts("東京タワー"); // ["Han", "Katakana"]     ← ordinary Japanese
 * ```
 */
export function getScripts(input: string): readonly UnicodeScript[] {
	if (!input || typeof input !== "string") return [];

	const meaningful = input.normalize("NFC").replace(SCRIPT_NEUTRAL, "");
	if (meaningful.length === 0) return [];

	const found: UnicodeScript[] = [];
	let uncovered = meaningful;

	for (const [script, pattern] of SCRIPT_PATTERNS) {
		if (pattern.test(meaningful)) {
			found.push(script);
			uncovered = uncovered.replace(new RegExp(pattern.source, "gu"), "");
		}
	}

	if (uncovered.length > 0) found.push("Other");
	return found;
}

//#endregion

//#region Restriction levels

/**
 * UTS #39 §5.2 identifier restriction levels, ordered most to least restrictive.
 *
 * Use as a policy dial rather than a boolean. A payments product might require
 * `highly_restrictive` for merchant display names; a global social product might
 * accept `moderately_restrictive` and merely alert on the rest.
 */
export type IdentifierRestrictionLevel =
	| "ascii_only"
	| "single_script"
	| "highly_restrictive"
	| "moderately_restrictive"
	| "minimally_restrictive"
	| "unrestricted";

/** Ordering for policy comparison. Lower is more restrictive. */
const RESTRICTION_ORDER: Readonly<Record<IdentifierRestrictionLevel, number>> = {
	ascii_only: 0,
	single_script: 1,
	highly_restrictive: 2,
	moderately_restrictive: 3,
	minimally_restrictive: 4,
	unrestricted: 5,
};

/**
 * Script combinations UTS #39 treats as Highly Restrictive despite spanning several
 * scripts, because each is simply how a major writing system is written.
 */
const HIGHLY_RESTRICTIVE_COMBINATIONS: readonly ReadonlySet<UnicodeScript>[] = [
	new Set<UnicodeScript>(["Latin", "Han", "Hiragana", "Katakana"]),
	new Set<UnicodeScript>(["Latin", "Han", "Bopomofo"]),
	new Set<UnicodeScript>(["Latin", "Han", "Hangul"]),
];

/**
 * Scripts whose Latin lookalikes are numerous enough that pairing them with Latin
 * reads as suspicious rather than merely multilingual — the basis of UTS #39's
 * Moderately Restrictive exclusion list.
 */
const HIGH_CONFUSION_SCRIPTS: ReadonlySet<UnicodeScript> = new Set<UnicodeScript>([
	"Cyrillic",
	"Greek",
	"Cherokee",
]);

/** True when every code unit is ASCII. */
function isAsciiOnly(input: string): boolean {
	for (let i = 0; i < input.length; i++) {
		if (input.charCodeAt(i) > 0x7f) return false;
	}
	return true;
}

/**
 * Classify a string against the UTS #39 restriction levels.
 *
 * @param input - String to classify.
 * @returns The most restrictive level the string satisfies.
 */
export function getRestrictionLevel(input: string): IdentifierRestrictionLevel {
	if (!input || typeof input !== "string") return "ascii_only";

	if (containsBidiControls(input) || containsInvisibleCharacters(input)) {
		return "unrestricted";
	}

	if (isAsciiOnly(input)) return "ascii_only";

	const scripts = getScripts(input);
	if (scripts.includes("Other")) return "minimally_restrictive";
	if (scripts.length <= 1) return "single_script";

	const present = new Set(scripts);
	for (const combination of HIGHLY_RESTRICTIVE_COMBINATIONS) {
		let contained = true;
		for (const script of present) {
			if (!combination.has(script)) {
				contained = false;
				break;
			}
		}
		if (contained) return "highly_restrictive";
	}

	// Latin plus exactly one other script, where that script is not one whose Latin
	// lookalikes make the pairing a common spoofing vehicle.
	if (present.has("Latin") && present.size === 2) {
		const other = scripts.find((script) => script !== "Latin");
		if (other !== undefined && !HIGH_CONFUSION_SCRIPTS.has(other)) {
			return "moderately_restrictive";
		}
	}

	return "minimally_restrictive";
}

//#endregion

//#region Invisible and bidirectional controls

/** Bidirectional embedding, override, and isolate controls. */
const BIDI_CONTROLS = /[\u202a-\u202e\u2066-\u2069]/;

/** Zero-width, soft-hyphen, and word-joiner code points. */
const INVISIBLE_CHARACTERS = /[\u00ad\u200b-\u200f\u2060-\u2064\ufeff]/;

/** Global variant used for stripping both families at once. */
const REMOVABLE_FORMATTING = /[\u00ad\u200b-\u200f\u2060-\u2064\ufeff\u202a-\u202e\u2066-\u2069]/g;

/**
 * Detect bidirectional override characters.
 *
 * Unlike the confusable checks, this is safe to run on **any** field. A bidi control
 * makes rendered text differ from its logical order — the "Trojan Source" technique
 * (CVE-2021-42574) — and no legitimate stored value needs one.
 *
 * @param input - String to test.
 * @returns `true` when a bidi embedding, override, or isolate control is present.
 */
export function containsBidiControls(input: string): boolean {
	if (!input || typeof input !== "string") return false;
	return BIDI_CONTROLS.test(input);
}

/**
 * Detect zero-width and other invisible formatting characters.
 *
 * Note that U+200C/U+200D (ZWNJ/ZWJ) are required for correct rendering of Persian,
 * Hindi, and several other scripts, and appear in ordinary emoji sequences. Treat a
 * hit as a reason to compare skeletons, not as grounds for rejection.
 *
 * @param input - String to test.
 * @returns `true` when an invisible formatting character is present.
 */
export function containsInvisibleCharacters(input: string): boolean {
	if (!input || typeof input !== "string") return false;
	return INVISIBLE_CHARACTERS.test(input);
}

/**
 * Remove invisible formatting and bidirectional control characters.
 *
 * @param input - String to clean.
 * @returns The string without those code points. Non-string input yields `""`.
 */
export function stripInvisibleCharacters(input: string): string {
	if (!input || typeof input !== "string") return "";
	return input.replace(REMOVABLE_FORMATTING, "");
}

//#endregion

//#region Identifier analysis

/** Everything the analyzer can say about one identifier. */
export interface IdentifierSecurityResult {
	/** The input, unchanged. Keep displaying this — never the skeleton. */
	readonly original: string;
	/** NFC-composed form. Safe to store and display. */
	readonly normalized: string;
	/** Opaque confusable comparison key. Compare it, never render it. */
	readonly skeleton: string;
	/** Scripts present, script-neutral characters excluded. */
	readonly scripts: readonly UnicodeScript[];
	/** `true` when several scripts are present and the mix is not an ordinary CJK one. */
	readonly isMixedScript: boolean;
	/** UTS #39 restriction level. */
	readonly restrictionLevel: IdentifierRestrictionLevel;
	/** `true` when a zero-width or invisible formatting character is present. */
	readonly hasInvisibleCharacters: boolean;
	/** `true` when a bidirectional control is present. Hostile in any field. */
	readonly hasBidiControls: boolean;
}

/**
 * Analyze a protected identifier.
 *
 * Read the fields; do not read a verdict — the caller's policy decides what to do.
 * The canonical use is: store `original` for display, index `skeleton`, and refuse a
 * registration whose skeleton already exists under a different `original`.
 *
 * @param input - Candidate identifier (username, domain, org name, package name).
 * @returns An {@link IdentifierSecurityResult}. Never throws.
 *
 * @example Collision check at registration time
 * ```ts
 * const candidate = analyzeIdentifier(requestedUsername);
 * if (await skeletonIndex.has(candidate.skeleton)) {
 *   return { error: "That name is too similar to an existing account" };
 * }
 * await accounts.create({ display: candidate.original, skeleton: candidate.skeleton });
 * ```
 */
export function analyzeIdentifier(input: string): IdentifierSecurityResult {
	const original = typeof input === "string" ? input : "";
	const normalized = original.normalize("NFC");
	const scripts = getScripts(normalized);
	const restrictionLevel = getRestrictionLevel(normalized);

	// `skeleton` is computed on first read rather than eagerly. It is the single most
	// expensive field — an NFD normalize, two regex passes, a per-code-point fold, then
	// an NFC normalize — and the callers that dominate volume never read it:
	// `containsHomoglyphs`, reached by default from `detectThreatPatterns`/`isSafeInput`,
	// uses only `isMixedScript`, `hasBidiControls` and `scripts`. Memoized, so the
	// registration-time collision check that does read it pays exactly once.
	let memoizedSkeleton: string | undefined;

	return {
		original,
		normalized,
		get skeleton(): string {
			memoizedSkeleton ??= getSkeleton(normalized);
			return memoizedSkeleton;
		},
		scripts,
		isMixedScript:
			scripts.length > 1 &&
			restrictionLevel !== "highly_restrictive" &&
			restrictionLevel !== "single_script",
		restrictionLevel,
		hasInvisibleCharacters: containsInvisibleCharacters(original),
		hasBidiControls: containsBidiControls(original),
	};
}

/**
 * Policy check over {@link analyzeIdentifier}.
 *
 * @param input - Candidate identifier.
 * @param maximumLevel - Least restrictive level to accept. Defaults to
 *   `"moderately_restrictive"`, which admits ordinary multilingual identifiers while
 *   rejecting Latin/Cyrillic and Latin/Greek mixes.
 * @returns `true` when the identifier sits at or below `maximumLevel` and carries no
 *   bidirectional controls.
 */
export function isSafeIdentifier(
	input: string,
	maximumLevel: IdentifierRestrictionLevel = "moderately_restrictive",
): boolean {
	const analysis = analyzeIdentifier(input);
	if (analysis.hasBidiControls) return false;
	return RESTRICTION_ORDER[analysis.restrictionLevel] <= RESTRICTION_ORDER[maximumLevel];
}

//#endregion
