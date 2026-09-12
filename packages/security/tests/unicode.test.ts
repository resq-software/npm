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

import { describe, expect, it } from "vitest";
import {
	analyzeIdentifier,
	areConfusable,
	containsBidiControls,
	containsInvisibleCharacters,
	foldConfusables,
	getRestrictionLevel,
	getScripts,
	getSkeleton,
	isSafeIdentifier,
	stripInvisibleCharacters,
} from "../src/unicode/index.js";

/** U+0430 CYRILLIC SMALL LETTER A, inside an otherwise Latin word. */
const CYRILLIC_PAYPAL = "pаypal";

/** U+03BF GREEK SMALL LETTER OMICRON, twice. */
const GREEK_GOOGLE = "gοοgle";

/** U+202E RIGHT-TO-LEFT OVERRIDE — the Trojan Source primitive. */
const BIDI_FILENAME = "invoice‮gnp.exe";

/** U+200B ZERO WIDTH SPACE inside a word. */
const ZERO_WIDTH_ADMIN = "ad​min";

// ============================================
// Skeletons
// ============================================

describe("getSkeleton", () => {
	it("folds Cyrillic lookalikes onto Latin", () => {
		expect(getSkeleton(CYRILLIC_PAYPAL)).toBe(getSkeleton("paypal"));
	});

	it("folds Greek lookalikes onto Latin", () => {
		expect(getSkeleton(GREEK_GOOGLE)).toBe(getSkeleton("google"));
	});

	it("folds fullwidth forms", () => {
		expect(getSkeleton("ａｐｐｌｅ")).toBe(getSkeleton("apple"));
	});

	it("folds mathematical alphanumerics", () => {
		expect(getSkeleton("\u{1d5ba}\u{1d5c9}\u{1d5c9}\u{1d5c5}\u{1d5be}")).toBe(getSkeleton("apple"));
	});

	it("collapses the I/l/1 family", () => {
		expect(getSkeleton("paypaI")).toBe(getSkeleton("paypal"));
	});

	it("collapses the O/o/0 family", () => {
		expect(getSkeleton("g00gle")).toBe(getSkeleton("google"));
	});

	it("drops combining marks", () => {
		expect(getSkeleton("José")).toBe(getSkeleton("Jose"));
	});

	it("drops zero-width characters", () => {
		expect(getSkeleton(ZERO_WIDTH_ADMIN)).toBe(getSkeleton("admin"));
	});

	it("does not collide genuinely distinct words", () => {
		const distinct = ["alice", "bob", "react", "preact", "stripe", "square"];
		expect(new Set(distinct.map(getSkeleton)).size).toBe(distinct.length);
	});

	it("keeps non-Latin scripts distinct", () => {
		expect(getSkeleton("北京")).not.toBe(getSkeleton("上海"));
	});

	it("returns empty string for empty or non-string input", () => {
		expect(getSkeleton("")).toBe("");
		expect(getSkeleton(null as unknown as string)).toBe("");
	});
});

// A capital lookalike filed under a lowercase prototype folds to the lowercase letter
// while its Latin twin folds to the uppercase one, so the pair compares as *not*
// confusable — the precise case an identifier check exists to catch.
describe("uppercase lookalikes fold to uppercase prototypes", () => {
	it.each([
		["Cyrillic ER", "Р", "P"],
		["Greek RHO", "Ρ", "P"],
		["Coptic RO", "Ⲣ", "P"],
		["Cyrillic DZE", "Ѕ", "S"],
		["Cherokee DU", "Ꮪ", "S"],
		["Cyrillic IZHITSA", "Ѵ", "V"],
		["Roman numeral five", "Ⅴ", "V"],
		["Cherokee DO", "Ꮩ", "V"],
		["Cyrillic WE", "Ԝ", "W"],
		["Cyrillic HA", "Х", "X"],
		["Greek CHI", "Χ", "X"],
		["Roman numeral ten", "Ⅹ", "X"],
		["Coptic KHI", "Ⲭ", "X"],
		["Cyrillic U", "У", "Y"],
		["Greek UPSILON", "Υ", "Y"],
		["Coptic UA", "Ⲩ", "Y"],
		["Greek ZETA", "Ζ", "Z"],
		["Cherokee NO", "Ꮓ", "Z"],
		["Latin Z with swash tail", "Ɀ", "Z"],
		["Roman numeral one thousand", "Ⅿ", "M"],
		["Coptic SIMA", "Ⲥ", "C"],
		["Coptic DEI", "Ϯ", "T"],
	])("%s folds onto %s", (_label, lookalike, latin) => {
		expect(getSkeleton(lookalike)).toBe(getSkeleton(latin));
		expect(getSkeleton(lookalike)).not.toBe(getSkeleton(latin.toLowerCase()));
	});

	it("keeps the two Roman numeral fives on their own case", () => {
		// U+2174 was listed under both `v` and `V`; later-row-wins folded it to `V`
		// while U+2164 folded to `v`, swapping the pair.
		expect(getSkeleton("ⅴ")).toBe(getSkeleton("v"));
		expect(getSkeleton("Ⅴ")).toBe(getSkeleton("V"));
		expect(areConfusable("ⅴ", "v")).toBe(true);
		expect(areConfusable("Ⅴ", "V")).toBe(true);
	});

	it("still folds the lowercase-shaped Lu letters onto lowercase", () => {
		// General category `Lu`, lowercase glyph — these belong where they are.
		for (const [lookalike, latin] of [
			["Ƅ", "b"],
			["Ь", "b"],
			["Ꮟ", "b"],
			["Ꮒ", "h"],
			["Ꭹ", "y"],
		] as const) {
			expect(getSkeleton(lookalike)).toBe(getSkeleton(latin));
		}
	});
});

describe("areConfusable", () => {
	it("reports confusable pairs", () => {
		expect(areConfusable(CYRILLIC_PAYPAL, "paypal")).toBe(true);
	});

	it("catches an uppercase spoof of a real name", () => {
		expect(areConfusable("РayPal", "PayPal")).toBe(true);
	});

	it("does not report a string as confusable with itself", () => {
		expect(areConfusable("paypal", "paypal")).toBe(false);
	});

	it("does not report distinct words", () => {
		expect(areConfusable("stripe", "square")).toBe(false);
	});
});

describe("foldConfusables", () => {
	it("folds non-ASCII lookalikes", () => {
		expect(foldConfusables(CYRILLIC_PAYPAL)).toBe("paypal");
	});

	it("preserves accents, unlike getSkeleton", () => {
		expect(foldConfusables("café")).toBe("café");
	});

	it("composes decomposed sequences to NFC", () => {
		expect(foldConfusables("é")).toBe("é");
	});

	it("never rewrites ASCII", () => {
		expect(foldConfusables("HELLO O1l|")).toBe("HELLO O1l|");
	});
});

// ============================================
// Script analysis
// ============================================

describe("getScripts", () => {
	it("identifies a single Latin script", () => {
		expect(getScripts("paypal")).toEqual(["Latin"]);
	});

	it("identifies a Latin/Cyrillic mix", () => {
		expect(getScripts(CYRILLIC_PAYPAL)).toEqual(["Latin", "Cyrillic"]);
	});

	it("ignores digits, punctuation, and spaces", () => {
		expect(getScripts("alice-99_x.y")).toEqual(["Latin"]);
	});

	it("reports ordinary Japanese as its constituent scripts", () => {
		// U+30FC (the prolonged sound mark) carries Script_Extensions
		// {Hiragana, Katakana}, so Hiragana appears even with no kana in the string.
		// That is the property doing its job: forcing a shared character into one
		// script is what makes ordinary Japanese look mixed-script.
		expect(getScripts("東京タワー")).toEqual(["Han", "Hiragana", "Katakana"]);
	});

	it("returns an empty list for a script-neutral string", () => {
		expect(getScripts("123-456")).toEqual([]);
	});
});

// ============================================
// Restriction levels
// ============================================

describe("getRestrictionLevel", () => {
	it("classifies ASCII as ascii_only", () => {
		expect(getRestrictionLevel("alice-99")).toBe("ascii_only");
	});

	it("classifies a single non-Latin script as single_script", () => {
		expect(getRestrictionLevel("Ольга")).toBe("single_script");
	});

	it("classifies Latin+Hangul as highly_restrictive", () => {
		expect(getRestrictionLevel("서울-Seoul")).toBe("highly_restrictive");
	});

	it("classifies a Latin/Cyrillic mix as minimally_restrictive", () => {
		expect(getRestrictionLevel(CYRILLIC_PAYPAL)).toBe("minimally_restrictive");
	});

	it("classifies bidi and invisible payloads as unrestricted", () => {
		expect(getRestrictionLevel(BIDI_FILENAME)).toBe("unrestricted");
		expect(getRestrictionLevel(ZERO_WIDTH_ADMIN)).toBe("unrestricted");
	});
});

// ============================================
// Invisible and bidi controls
// ============================================

describe("containsBidiControls", () => {
	it("detects a right-to-left override (Trojan Source)", () => {
		expect(containsBidiControls(BIDI_FILENAME)).toBe(true);
	});

	it("detects isolate controls", () => {
		expect(containsBidiControls("a⁦b⁩c")).toBe(true);
	});

	it("does not fire on ordinary right-to-left text", () => {
		// Arabic is right-to-left by character property, not by an override control.
		expect(containsBidiControls("محمد")).toBe(false);
	});

	it("does not fire on ordinary Latin text", () => {
		expect(containsBidiControls("ordinary text")).toBe(false);
	});
});

describe("containsInvisibleCharacters", () => {
	it("detects a zero-width space", () => {
		expect(containsInvisibleCharacters(ZERO_WIDTH_ADMIN)).toBe(true);
	});

	it("detects a soft hyphen", () => {
		expect(containsInvisibleCharacters("ad­min")).toBe(true);
	});

	it("does not fire on ordinary text", () => {
		expect(containsInvisibleCharacters("admin")).toBe(false);
	});
});

describe("stripInvisibleCharacters", () => {
	it("removes zero-width and bidi code points", () => {
		expect(stripInvisibleCharacters("a​d‮m⁩in")).toBe("admin");
	});

	it("leaves ordinary text unchanged", () => {
		expect(stripInvisibleCharacters("admin")).toBe("admin");
	});
});

// ============================================
// Identifier analysis
// ============================================

describe("analyzeIdentifier", () => {
	it("preserves the original for display and exposes a skeleton for comparison", () => {
		const analysis = analyzeIdentifier(CYRILLIC_PAYPAL);
		expect(analysis.original).toBe(CYRILLIC_PAYPAL);
		expect(analysis.normalized).toBe(CYRILLIC_PAYPAL);
		expect(analysis.skeleton).toBe("paypal");
	});

	it("flags a Latin/Cyrillic spoof as mixed-script", () => {
		expect(analyzeIdentifier(CYRILLIC_PAYPAL).isMixedScript).toBe(true);
	});

	it("does not flag ordinary Japanese as mixed-script", () => {
		expect(analyzeIdentifier("東京タワー").isMixedScript).toBe(false);
	});

	it("does not flag a single-script Cyrillic name", () => {
		const analysis = analyzeIdentifier("Ольга");
		expect(analysis.isMixedScript).toBe(false);
		expect(analysis.hasBidiControls).toBe(false);
	});

	it("reports bidi controls", () => {
		expect(analyzeIdentifier(BIDI_FILENAME).hasBidiControls).toBe(true);
	});

	it("handles non-string input without throwing", () => {
		const analysis = analyzeIdentifier(null as unknown as string);
		expect(analysis.original).toBe("");
		expect(analysis.skeleton).toBe("");
	});
});

describe("isSafeIdentifier", () => {
	it("accepts ASCII, single-script, and ordinary CJK identifiers", () => {
		expect(isSafeIdentifier("alice-99")).toBe(true);
		expect(isSafeIdentifier("Ольга")).toBe(true);
		expect(isSafeIdentifier("東京タワー")).toBe(true);
		expect(isSafeIdentifier("서울-Seoul")).toBe(true);
	});

	it("rejects Latin/Cyrillic spoofs", () => {
		expect(isSafeIdentifier(CYRILLIC_PAYPAL)).toBe(false);
	});

	it("rejects bidi and zero-width payloads", () => {
		expect(isSafeIdentifier(BIDI_FILENAME)).toBe(false);
		expect(isSafeIdentifier(ZERO_WIDTH_ADMIN)).toBe(false);
	});

	it("honours a stricter policy level", () => {
		expect(isSafeIdentifier("Ольга", "ascii_only")).toBe(false);
		expect(isSafeIdentifier("alice", "ascii_only")).toBe(true);
	});
});
