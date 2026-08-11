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
 * @fileoverview Confusable-character data and UTS #39 skeleton generation.
 *
 * A *skeleton* is an opaque comparison key. Two strings whose skeletons are equal are
 * visually confusable; that is the only thing a skeleton means. It is not a normalized
 * identifier, it is not safe to display, and it must never be stored in place of what
 * the user actually typed — the point is to keep the original for display and compare
 * skeletons for collisions.
 *
 * Coverage is split in two:
 *
 * - **Algorithmic ranges** — fullwidth forms, mathematical alphanumerics, and
 *   enclosed/parenthesized letters are contiguous ranges at a fixed offset from
 *   ASCII, so they fold by computation rather than by table. That covers several
 *   thousand code points in a few lines.
 * - **A curated table** — the Cyrillic, Greek, Armenian, Cherokee, Coptic, and
 *   Canadian-Aboriginal glyphs that render like Latin letters, written as numeric
 *   code points so the source stays ASCII and every entry is reviewable in a diff.
 *
 * This is not the complete `confusables.txt` dataset (~6 000 mappings). It covers the
 * Latin-target subset, which is what matters for the identifiers this package guards:
 * usernames, domains, org names, package names. Callers needing full UTS #39 coverage
 * should layer a dedicated dataset on top and track Unicode's release cadence.
 *
 * @module @resq-systems/security/unicode/confusables
 */

//#region Curated table

/**
 * Confusable code points grouped by the ASCII prototype they fold to.
 *
 * Written as numeric code points on purpose. A table of raw lookalike glyphs is by
 * construction unreadable in review — the entries are supposed to be
 * indistinguishable from their targets — and one stray copy-paste produces exactly
 * the silent duplicate the previous `HOMOGLYPH_MAP` carried on its `a` row.
 *
 * The `l` and `o` rows fold across case (`I`, `l`, `1` all become `l`; `O`, `o`, `0`
 * all become `o`) because those glyph families are genuinely indistinguishable in
 * most typefaces. Every other row preserves case.
 */
const CONFUSABLES_BY_PROTOTYPE: Readonly<Record<string, readonly number[]>> = {
	a: [0x0430, 0x03b1, 0x0251, 0x0252, 0x1d00, 0x237a, 0xab7a],
	b: [0x0184, 0x042c, 0x044c, 0x13cf, 0x15af, 0x0432, 0x1d03, 0x0180],
	c: [0x0441, 0x03f2, 0x2ca5, 0x1d04, 0x217d, 0x0188, 0x2ca4],
	d: [0x0501, 0x13e7, 0x146f, 0x2146, 0x217e, 0x0257, 0x1d05],
	e: [0x0435, 0x04bd, 0x212e, 0x1d07, 0xab32, 0x0454, 0x2107],
	f: [0x017f, 0x0192, 0x03dd, 0x1e9d, 0xa799],
	g: [0x0261, 0x01e5, 0x0581, 0x13fb, 0x1d83, 0x210a],
	h: [0x04bb, 0x0570, 0x13c2, 0x210e, 0x048b],
	i: [0x0456, 0x03b9, 0x0269, 0x2170, 0x2139, 0x0131, 0x1fbe, 0x2373],
	j: [0x0458, 0x03f3, 0x0575, 0x2149],
	k: [0x043a, 0x03ba, 0x1d0b, 0x2c95, 0x0138],
	l: [
		0x0049, 0x0031, 0x007c, 0x04cf, 0x2113, 0x217c, 0x0196, 0x01c0, 0x05c0, 0x2160, 0x216c, 0x2223,
		0x0399, 0x0406, 0x2110, 0x0142,
	],
	m: [0x043c, 0x217f, 0x1d0d, 0x216f, 0x028d],
	n: [0x0578, 0x1d0e, 0x0273, 0x057c],
	o: [
		0x004f, 0x0030, 0x043e, 0x041e, 0x03bf, 0x039f, 0x0585, 0x0555, 0x0665, 0x06f5, 0x0966, 0x0ae6,
		0x0be6, 0x0c66, 0x1d0f, 0x2c9e, 0x2c9f, 0x0b66, 0x101d, 0x1d11,
	],
	p: [0x0440, 0x03c1, 0x2374, 0x1d18, 0x0420, 0x03a1, 0x2ca2, 0x2ca3],
	q: [0x051b, 0x0563, 0xa757],
	r: [0x0433, 0x1d26, 0x2c85, 0x0453, 0x027e],
	s: [0x0455, 0xa731, 0x13da, 0x01bd, 0x0405, 0x0282],
	t: [0x0442, 0x03c4, 0x03ee, 0x1d1b, 0x0163],
	u: [0x03c5, 0x057d, 0x1d1c, 0x0446, 0x028b],
	v: [0x03bd, 0x0475, 0x2174, 0x13d9, 0x2228, 0x1d20, 0x0474, 0x2164],
	w: [0x051d, 0x0561, 0x1d21, 0x0448, 0x051c, 0xab83],
	x: [0x0445, 0x03c7, 0x2179, 0x0425, 0x03a7, 0x2169, 0x2cac, 0x166d, 0x00d7],
	y: [0x0443, 0x03b3, 0x028f, 0x04af, 0x13a9, 0x0423, 0x03a5, 0x2ca8, 0x1eff, 0x03d2],
	z: [0x0290, 0x1d22, 0xa763, 0x0396, 0x13c3, 0x2c7f, 0x01b6],
	A: [0x0410, 0x0391, 0x13aa, 0x2c6d],
	B: [0x0412, 0x0392, 0x13f4, 0x15f7, 0x2c82, 0x212c],
	C: [0x0421, 0x03f9, 0x216d, 0x13df, 0x2102, 0x212d],
	D: [0x13a0, 0x216e, 0x15ea, 0x2145],
	E: [0x0415, 0x0395, 0x13ac, 0x2d39, 0x2130, 0x04bc],
	F: [0x03dc, 0x15b4, 0xa798, 0x2131],
	G: [0x050c, 0x13c0, 0xa7a0, 0x050d, 0x2ca0],
	H: [0x041d, 0x0397, 0x13bb, 0x210b, 0x2c8e, 0x210c, 0x210d],
	J: [0x0408, 0x13ab, 0x148d, 0x1d0a],
	K: [0x041a, 0x039a, 0x212a, 0x13e6, 0x2c94],
	L: [0x13de, 0x1d0c, 0x2cd0, 0x2112, 0x14aa],
	M: [0x041c, 0x039c, 0x13b7, 0x2c98, 0x2133],
	N: [0x039d, 0x2c9a, 0x2115, 0x0274],
	P: [0x13e2, 0x2119, 0x146d],
	Q: [0x051a, 0x2d55, 0xa756, 0x211a, 0x213a],
	R: [0x13a1, 0x13d2, 0x1d19, 0x01a6, 0x211b, 0x211d],
	S: [0x2ca1, 0x0218],
	T: [0x0422, 0x03a4, 0x13a2, 0x22a4, 0x2ca6],
	U: [0x054d, 0x222a, 0x054f],
	V: [0x2174],
	W: [0x13b3, 0x051e],
	X: [0x2573, 0x2cad],
	Y: [0x04ae, 0x213f],
	Z: [0x2124, 0x13c4],
	"2": [0x01a7, 0x03e8, 0xa644, 0x14bf],
	"3": [0x0417, 0x04e0, 0x01b7, 0x2ccc, 0x0499],
	"4": [0x13ce, 0x146c],
	"5": [0x01bc, 0x1d7d],
	"6": [0x0431, 0x13ee, 0x0411],
	"7": [0x04c0, 0x1d7c],
	"8": [0x0222, 0x0b03, 0x09ea],
	"9": [0x0669, 0x06f9, 0x13ed, 0x0967],
	"-": [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212, 0x2043, 0xfe58, 0x058a, 0x1806],
	".": [0x0660, 0x06f0, 0x2024, 0xa4f8, 0x0701, 0x0702],
	"/": [0x2044, 0x2215, 0x2571, 0x29f8, 0x1735, 0x3033],
	"\\": [0x2216, 0x29f5, 0x2572, 0x244a, 0xfe68],
	"'": [0x2018, 0x2019, 0x02b9, 0x02bc, 0x02c8, 0x055a, 0x05f3, 0x2032],
	'"': [0x201c, 0x201d, 0x02ba, 0x05f4, 0x2033],
	":": [0x0589, 0x05c3, 0x2236, 0xa789, 0xfe30, 0x2982],
	";": [0x037e, 0xfe14],
	"!": [0x01c3, 0x2d51, 0xfe15],
	"?": [0x0294, 0x0241, 0x097d, 0x13ae],
	"(": [0x2768, 0x239b],
	")": [0x2769, 0x239e],
	"[": [0x2772, 0x3010],
	"]": [0x2773, 0x3011],
	"{": [0x2774],
	"}": [0x2775],
	"@": [0x0e4f],
	"#": [0x2d5e],
	$: [0x1e9f],
	"%": [0x066a, 0x2052],
	"&": [0xa778],
	"*": [0x066d, 0x204e, 0x2217, 0x1031f],
	"+": [0x16ed, 0x2795, 0x271a],
	",": [0x060d, 0x066b, 0x201a, 0x3001],
	"<": [0x02c2, 0x1438, 0x2039, 0x276e],
	">": [0x02c3, 0x1433, 0x203a, 0x276f],
	"=": [0x2e40, 0x30a0, 0xa4ff],
	"~": [0x02dc, 0x1fc0, 0x2053, 0x223c],
	"^": [0x02c4, 0x02c6],
	_: [0x02cd, 0xff3f],
	"`": [0x02cb],
	"|": [0x2758, 0xffe8, 0x0964],
};

/**
 * Flattened lookup: confusable code point to its ASCII prototype.
 *
 * Later rows win on collision. That is intentional and harmless — a code point listed
 * under two prototypes is confusable with both, so either answer yields the same
 * collision behavior provided the choice is deterministic, which it is.
 */
export const CONFUSABLE_MAP: ReadonlyMap<number, string> = (() => {
	const map = new Map<number, string>();
	for (const [prototype, codePoints] of Object.entries(CONFUSABLES_BY_PROTOTYPE)) {
		for (const codePoint of codePoints) {
			map.set(codePoint, prototype);
		}
	}
	return map;
})();

//#endregion

//#region Algorithmic ranges

/** Fullwidth `U+FF01`–`U+FF5E` map to `!`–`~` by subtracting this offset. */
const FULLWIDTH_OFFSET = 0xfee0;

/** Lowest fullwidth form that folds to ASCII. */
const FULLWIDTH_START = 0xff01;

/** Highest fullwidth form that folds to ASCII. */
const FULLWIDTH_END = 0xff5e;

/**
 * Contiguous ranges that fold to ASCII at a fixed offset from the range start.
 *
 * Each entry is `[rangeStart, rangeEnd, asciiStart]`. Handling these by computation
 * rather than by table folds several thousand code points — the mathematical
 * alphanumeric block alone is over 1 000 — without a single table row.
 */
const ALGORITHMIC_RANGES: readonly (readonly [number, number, number])[] = [
	// Mathematical alphanumeric symbols: styled copies of A-Z then a-z.
	[0x1d400, 0x1d419, 0x41],
	[0x1d41a, 0x1d433, 0x61],
	[0x1d434, 0x1d44d, 0x41],
	[0x1d44e, 0x1d467, 0x61],
	[0x1d468, 0x1d481, 0x41],
	[0x1d482, 0x1d49b, 0x61],
	[0x1d49c, 0x1d4b5, 0x41],
	[0x1d4b6, 0x1d4cf, 0x61],
	[0x1d4d0, 0x1d4e9, 0x41],
	[0x1d4ea, 0x1d503, 0x61],
	[0x1d504, 0x1d51d, 0x41],
	[0x1d51e, 0x1d537, 0x61],
	[0x1d538, 0x1d551, 0x41],
	[0x1d552, 0x1d56b, 0x61],
	[0x1d56c, 0x1d585, 0x41],
	[0x1d586, 0x1d59f, 0x61],
	[0x1d5a0, 0x1d5b9, 0x41],
	[0x1d5ba, 0x1d5d3, 0x61],
	[0x1d5d4, 0x1d5ed, 0x41],
	[0x1d5ee, 0x1d607, 0x61],
	[0x1d608, 0x1d621, 0x41],
	[0x1d622, 0x1d63b, 0x61],
	[0x1d63c, 0x1d655, 0x41],
	[0x1d656, 0x1d66f, 0x61],
	[0x1d670, 0x1d689, 0x41],
	[0x1d68a, 0x1d6a3, 0x61],
	// Mathematical digits: five styled copies of 0-9.
	[0x1d7ce, 0x1d7d7, 0x30],
	[0x1d7d8, 0x1d7e1, 0x30],
	[0x1d7e2, 0x1d7eb, 0x30],
	[0x1d7ec, 0x1d7f5, 0x30],
	[0x1d7f6, 0x1d7ff, 0x30],
	// Enclosed alphanumerics and parenthesized letters.
	[0x24b6, 0x24cf, 0x41],
	[0x24d0, 0x24e9, 0x61],
	[0x249c, 0x24b5, 0x61],
	// Regional indicator and squared Latin letters render as boxed capitals.
	[0x1f130, 0x1f149, 0x41],
	[0x1f150, 0x1f169, 0x41],
	[0x1f170, 0x1f189, 0x41],
];

/**
 * {@link ALGORITHMIC_RANGES} as start-sorted parallel arrays, built once at module load.
 *
 * The literal above stays the source of truth because it is grouped for reading — maths
 * alphanumerics, then digits, then enclosed forms — which leaves it unsorted, so it can
 * only be searched linearly. Sorting a derived copy allows a binary search without
 * reordering the table a reviewer reads.
 */
const [RANGE_STARTS, RANGE_ENDS, RANGE_ASCII_STARTS] = (() => {
	const sorted = [...ALGORITHMIC_RANGES].sort((a, b) => a[0] - b[0]);
	return [
		Int32Array.from(sorted, (range) => range[0]),
		Int32Array.from(sorted, (range) => range[1]),
		Int32Array.from(sorted, (range) => range[2]),
	] as const;
})();

/** Lowest code point covered by any algorithmic range. */
const MIN_RANGE_START = RANGE_STARTS[0] as number;

/** Highest code point covered by any algorithmic range. */
const MAX_RANGE_END = RANGE_ENDS.reduce((max, end) => (end > max ? end : max), 0);

/**
 * Fold one code point to its ASCII prototype.
 *
 * @param codePoint - Code point to fold.
 * @returns The ASCII prototype, or `null` when the code point is not confusable with
 *   anything in the ASCII range.
 */
function foldCodePoint(codePoint: number): string | null {
	if (codePoint >= FULLWIDTH_START && codePoint <= FULLWIDTH_END) {
		return String.fromCodePoint(codePoint - FULLWIDTH_OFFSET);
	}

	// One comparison rejects the entire algorithmic block for ASCII, Cyrillic, Greek,
	// Hebrew, Arabic, Devanagari and CJK — which is very nearly all real input. The
	// previous linear walk charged each of those characters all 37 range comparisons
	// before reaching the map, making the fold O(n * 37) rather than O(n).
	if (codePoint >= MIN_RANGE_START && codePoint <= MAX_RANGE_END) {
		// The ranges do not overlap, so a start-ordered bisection is exact: a code
		// point in a gap between two ranges exits the loop and falls through.
		let low = 0;
		let high = RANGE_STARTS.length - 1;
		while (low <= high) {
			const mid = (low + high) >> 1;
			if (codePoint < (RANGE_STARTS[mid] as number)) {
				high = mid - 1;
			} else if (codePoint > (RANGE_ENDS[mid] as number)) {
				low = mid + 1;
			} else {
				const offset = codePoint - (RANGE_STARTS[mid] as number);
				return String.fromCodePoint((RANGE_ASCII_STARTS[mid] as number) + offset);
			}
		}
	}

	return CONFUSABLE_MAP.get(codePoint) ?? null;
}

//#endregion

//#region Skeleton

/** Combining marks, dropped during skeleton generation. */
const COMBINING_MARKS = /\p{M}/gu;

/** Default-ignorable and zero-width code points, which contribute nothing visually. */
const INVISIBLE_CODE_POINTS = /[\u00ad\u200b-\u200f\u2060-\u2064\ufeff\u202a-\u202e\u2066-\u2069]/g;

/**
 * Generate a UTS #39-style confusable skeleton.
 *
 * Pipeline: decompose to NFD, drop invisible and combining code points, fold each
 * remaining code point through the confusable tables, recompose to NFC.
 *
 * Two strings with equal skeletons are visually confusable. That is *all* an equal
 * skeleton means — in particular it does not mean the strings are equivalent, and the
 * skeleton is neither a display nor a storage form. Accents are dropped and the
 * `I/l/1` and `O/o/0` families collapse across case, so `José`, `Jose`, and `J0sé`
 * share a skeleton by design.
 *
 * @param input - Raw string. Non-string or empty input yields `""`.
 * @returns The comparison key.
 *
 * @example
 * ```ts
 * // Cyrillic а in an otherwise Latin string.
 * getSkeleton("pаypal") === getSkeleton("paypal"); // true
 * getSkeleton("paypaI") === getSkeleton("paypal");      // true — I folds to l
 * ```
 */
export function getSkeleton(input: string): string {
	if (!input || typeof input !== "string") return "";

	const decomposed = input
		.normalize("NFD")
		.replace(INVISIBLE_CODE_POINTS, "")
		.replace(COMBINING_MARKS, "");

	let skeleton = "";
	for (const character of decomposed) {
		const codePoint = character.codePointAt(0);
		if (codePoint === undefined) continue;
		skeleton += foldCodePoint(codePoint) ?? character;
	}

	return skeleton.normalize("NFC");
}

/**
 * Map non-ASCII lookalike characters onto their ASCII prototypes, preserving
 * everything else.
 *
 * Unlike {@link getSkeleton} this is a *conservative* transform: accents and other
 * combining marks survive, ASCII characters are never rewritten, and the result stays
 * readable. `Ολγα` keeps its Greek letters only insofar as they are not Latin
 * lookalikes; `café` stays `café`.
 *
 * Even so, prefer {@link getSkeleton} for collision checks and keep the original for
 * display. Rewriting a user's identifier into a different string is a lossy operation
 * that this function can only make *look* safe.
 *
 * @param input - Raw string. Non-string or empty input yields `""`.
 * @returns NFC-composed string with non-ASCII confusables folded to ASCII.
 *
 * @example
 * ```ts
 * foldConfusables("pаypal"); // "paypal" — Cyrillic а folded
 * foldConfusables("café");    // "café"   — accent preserved
 * foldConfusables("HELLO");   // "HELLO"  — ASCII untouched
 * ```
 */
export function foldConfusables(input: string): string {
	if (!input || typeof input !== "string") return "";

	let folded = "";
	for (const character of input.normalize("NFC")) {
		const codePoint = character.codePointAt(0);
		if (codePoint === undefined) continue;
		// ASCII is left alone: folding `O` to `o` or `I` to `l` is right for an opaque
		// comparison key and wrong for a value anyone will read.
		folded += codePoint <= 0x7f ? character : (foldCodePoint(codePoint) ?? character);
	}

	return folded.normalize("NFC");
}

/**
 * Test whether two distinct strings are visually confusable.
 *
 * @param left - First string.
 * @param right - Second string.
 * @returns `true` when the strings differ but their skeletons match.
 */
export function areConfusable(left: string, right: string): boolean {
	if (left === right) return false;
	return getSkeleton(left) === getSkeleton(right);
}

//#endregion
