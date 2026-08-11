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
 * @fileoverview Parser round-trip conformance for the HTML output encoders.
 *
 * Asserts against a real HTML parser rather than golden strings: escape a code point,
 * put it in a document, parse it, and require the value back. A golden string only pins
 * what the encoder does today; a parser pins what a browser will actually see.
 *
 * The sweep is exhaustive over the bands where every finding lives, and carries a
 * coverage assertion borrowed from the OWASP Java Encoder's own suite — every swept code
 * point must be classified as either round-tripping or a documented exception, so a
 * silent third category cannot appear.
 */

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { escapeHtmlAttribute, escapeHtmlText } from "../src/validators.js";

//#region Sweep

/**
 * Code points to sweep.
 *
 * Exhaustive over 0x00-0xFF and the general-punctuation block, plus named astral cases.
 * A stride through the rest of the BMP and the astral planes produced zero findings, so
 * a wider sweep buys runtime and nothing else — every difference lives below 0x0100.
 */
function sweptCodePoints(): number[] {
	const points: number[] = [];
	for (let codePoint = 0x00; codePoint <= 0xff; codePoint++) points.push(codePoint);
	for (let codePoint = 0x2000; codePoint <= 0x206f; codePoint++) points.push(codePoint);
	// Emoji, the first supplementary code point, a maths alphanumeric, BOM, replacement.
	points.push(0x1f389, 0x10000, 0x1d400, 0xfeff, 0xfffd);
	// Lone surrogates are not scalar values and cannot appear in a document.
	return points.filter((codePoint) => codePoint < 0xd800 || codePoint > 0xdfff);
}

/**
 * Parse every candidate in a single document, keyed by index.
 *
 * One JSDOM instance per code point costs about eleven seconds; one instance for the
 * whole sweep costs a fraction of that, and tests nothing less — each row carries a
 * marker attribute the encoder never emits, so a value that escaped its element would
 * lose its own row and fail loudly rather than quietly passing.
 *
 * @param rows - Markup fragments, one per candidate, already escaped.
 * @returns The parsed rows, indexed as supplied.
 */
function parseRows(rows: readonly string[]): (Element | null)[] {
	const body = rows.map((row, index) => `<div data-i="${index}">${row}</div>`).join("");
	const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`);
	return rows.map((_, index) => dom.window.document.querySelector(`div[data-i="${index}"]`));
}

/** Attribute round trip for every character, in one parse. */
function attributeRoundTrips(characters: readonly string[]) {
	const parsed = parseRows(
		characters.map((character) => `<span class=${escapeHtmlAttribute(character)}>x</span>`),
	);
	return parsed.map((row) => {
		const span = row?.querySelector("span") ?? null;
		return {
			attributes: span?.attributes.length ?? -1,
			value: span?.getAttribute("class") ?? null,
		};
	});
}

/** Text round trip for every character, in one parse. */
function textRoundTrips(characters: readonly string[]): (string | null)[] {
	const parsed = parseRows(characters.map((character) => escapeHtmlText(character)));
	return parsed.map((row) => row?.textContent ?? null);
}

//#endregion

//#region Documented exceptions

/**
 * C1 code points the HTML parser maps to a Windows-1252 character.
 *
 * The numeric-character-reference end state carries a lookup table for 0x80-0x9F, so a
 * reference the encoder emits for one of these decodes to a *different* character — the
 * escape for U+0080 comes back as a euro sign. Lossy rather than dangerous: every
 * replacement is an inert printable character, and the alternative, leaving C1 raw, is
 * worse. The four omitted from this set map to themselves.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html
 */
const WINDOWS_1252_REMAPPED: ReadonlySet<number> = new Set([
	0x80, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8e, 0x91, 0x92, 0x93,
	0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9e, 0x9f,
]);

/**
 * Why a code point is not expected to survive an attribute round trip.
 *
 * @param codePoint - The code point under test.
 * @returns The tokenizer rule responsible, or `null` when it should round-trip exactly.
 */
function attributeException(codePoint: number): string | null {
	if (codePoint === 0x00) return "NULL is replaced with U+FFFD by the tokenizer";
	if (WINDOWS_1252_REMAPPED.has(codePoint)) {
		return "the numeric character reference end state maps this C1 code point to Windows-1252";
	}
	return null;
}

/**
 * Why a code point is not expected to survive a text round trip.
 *
 * @param codePoint - The code point under test.
 * @returns The tokenizer rule responsible, or `null` when it should round-trip exactly.
 */
function textException(codePoint: number): string | null {
	// Unlike the attribute case, a NULL in character data is dropped rather than replaced.
	if (codePoint === 0x00) return "NULL in character data is dropped";
	// The input stream preprocessor normalises CR to LF before the tokenizer runs — which
	// is exactly why escaping CR in an attribute was never the load-bearing part.
	if (codePoint === 0x0d) return "the input stream preprocessor normalises CR to LF";
	return null;
}

/** Format a code point for a failure message. */
const label = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;

//#endregion

describe("HTML encoder parser conformance", () => {
	const codePoints = sweptCodePoints();
	const characters = codePoints.map((codePoint) => String.fromCodePoint(codePoint));

	it("sweeps the bands where every difference lives", () => {
		expect(codePoints.length).toBeGreaterThan(350);
	});

	describe("attribute context", () => {
		const parsed = attributeRoundTrips(characters);
		const roundTrips = (index: number) =>
			parsed[index]?.attributes === 1 && parsed[index]?.value === characters[index];

		it("round-trips every code point that has no documented exception", () => {
			const broken = codePoints
				.map((codePoint, index) => ({ codePoint, index }))
				.filter(
					({ codePoint, index }) => attributeException(codePoint) === null && !roundTrips(index),
				)
				.map(
					({ codePoint, index }) =>
						`${label(codePoint)} -> ${JSON.stringify(parsed[index]?.value)}`,
				);
			expect(broken).toEqual([]);
		});

		// The assertion that matters: an escaped value must never introduce a second
		// attribute, whatever it contains. That is the entire job of the encoder, and it is
		// exactly what U+000C defeated before it was escaped.
		it("never lets a value introduce a second attribute", () => {
			const injected = attributeRoundTrips(
				characters.map((character) => `foo${character}autofocus`),
			)
				.map((row, index) => (row.attributes === 1 ? null : label(codePoints[index] as number)))
				.filter((entry): entry is string => entry !== null);
			expect(injected).toEqual([]);
		});

		// Borrowed from the OWASP Java Encoder suite: a total partition, with no third
		// bucket. Without it an exception could quietly stop being one — or a new
		// difference could appear — and nothing would notice.
		it("classifies every swept code point as round-tripping or documented", () => {
			const unclassified = codePoints
				.filter(
					(codePoint, index) => roundTrips(index) === (attributeException(codePoint) !== null),
				)
				.map(label);
			expect(unclassified).toEqual([]);
		});
	});

	describe("text context", () => {
		const parsed = textRoundTrips(characters);
		const roundTrips = (index: number) => parsed[index] === characters[index];

		it("round-trips every code point that has no documented exception", () => {
			const broken = codePoints
				.map((codePoint, index) => ({ codePoint, index }))
				.filter(({ codePoint, index }) => textException(codePoint) === null && !roundTrips(index))
				.map(({ codePoint, index }) => `${label(codePoint)} -> ${JSON.stringify(parsed[index])}`);
			expect(broken).toEqual([]);
		});

		it("never lets a value open an element", () => {
			const payloads = characters.map((character) => `${character}<img src=x onerror=alert(1)>`);
			const rows = parseRows(payloads.map((payload) => escapeHtmlText(payload)));
			const opened = rows
				.map((row, index) =>
					(row?.children.length ?? 0) > 0 ? label(codePoints[index] as number) : null,
				)
				.filter((entry): entry is string => entry !== null);
			expect(opened).toEqual([]);
		});

		it("classifies every swept code point as round-tripping or documented", () => {
			const unclassified = codePoints
				.filter((codePoint, index) => roundTrips(index) === (textException(codePoint) !== null))
				.map(label);
			expect(unclassified).toEqual([]);
		});
	});
});
