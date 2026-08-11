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

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isApngAnimated } from "../../../src/browser/media/apng.js";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/**
 * Build one PNG chunk: `length(4) type(4) data(length) crc(4)`.
 *
 * The CRC is left zero — `isApngAnimated` walks the structure and never verifies
 * it, and a fixture that lied about that would be testing the wrong contract.
 */
function chunk(type: string, data: Uint8Array = new Uint8Array(0)): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	new DataView(out.buffer).setUint32(0, data.length);
	for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
	out.set(data, 8);
	return out;
}

/** Concatenate the PNG signature and a chunk sequence into one buffer. */
function png(...chunks: readonly Uint8Array[]): ArrayBuffer {
	const parts = [new Uint8Array(SIGNATURE), ...chunks];
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out.buffer;
}

const IHDR = chunk("IHDR", new Uint8Array(13));
const ACTL = chunk("acTL", new Uint8Array(8));
const IDAT = chunk("IDAT", new Uint8Array(10));
const IEND = chunk("IEND");

/** `n` bytes of valid two-byte UTF-8 (U+00E9), which decodes to `n / 2` UTF-16 units. */
function twoByteUtf8(n: number): Uint8Array {
	const out = new Uint8Array(n);
	for (let i = 0; i < n; i += 2) {
		out[i] = 0xc3;
		out[i + 1] = 0xa9;
	}
	return out;
}

/** `n` bytes of valid four-byte UTF-8 (U+1F600), which decodes to `n / 2` UTF-16 units. */
function fourByteUtf8(n: number): Uint8Array {
	const out = new Uint8Array(n);
	for (let i = 0; i < n; i += 4) {
		out[i] = 0xf0;
		out[i + 1] = 0x9f;
		out[i + 2] = 0x98;
		out[i + 3] = 0x80;
	}
	return out;
}

describe("isApngAnimated", () => {
	describe("rejects what is not a walkable PNG", () => {
		it("returns false for an empty ArrayBuffer", () => {
			expect(isApngAnimated(new ArrayBuffer(0))).toBe(false);
		});

		it("returns false for a buffer too small to be a PNG", () => {
			expect(isApngAnimated(new ArrayBuffer(8))).toBe(false);
		});

		it("returns false one byte below the signature-plus-header minimum", () => {
			expect(isApngAnimated(new ArrayBuffer(15))).toBe(false);
		});

		it("returns false for non-PNG data carrying a JPEG signature", () => {
			const buffer = new ArrayBuffer(64);
			new Uint8Array(buffer).set([0xff, 0xd8, 0xff, 0xe0]);
			expect(isApngAnimated(buffer)).toBe(false);
		});

		it("returns false for a signature with no room for a chunk body", () => {
			const bytes = new Uint8Array([...SIGNATURE, 0, 0, 0, 0, 0x61, 0x61, 0x61, 0x61]);
			expect(isApngAnimated(bytes.buffer)).toBe(false);
		});
	});

	describe("classifies well-formed streams", () => {
		it("returns true for an APNG whose acTL precedes IDAT", () => {
			expect(isApngAnimated(png(IHDR, ACTL, IDAT, IEND))).toBe(true);
		});

		it("returns false for a static PNG with no acTL", () => {
			expect(isApngAnimated(png(IHDR, IDAT, IEND))).toBe(false);
		});

		it("returns false when acTL follows IDAT, which is not a valid APNG", () => {
			expect(isApngAnimated(png(IHDR, IDAT, ACTL, IEND))).toBe(false);
		});

		it("stops at IEND rather than reading past the end of the stream", () => {
			expect(isApngAnimated(png(IHDR, IDAT, IEND, ACTL))).toBe(false);
		});

		it("finds acTL behind several unrelated ancillary chunks", () => {
			const ancillary = [
				chunk("gAMA", new Uint8Array(4)),
				chunk("cHRM", new Uint8Array(32)),
				chunk("pHYs", new Uint8Array(9)),
			];
			expect(isApngAnimated(png(IHDR, ...ancillary, ACTL, IDAT, IEND))).toBe(true);
		});
	});

	// Both of these passed before the chunk walk replaced a text scan over the
	// decoded bytes, and both are silent: the caller gets a clean boolean.
	describe("regressions from scanning bytes as text", () => {
		it("returns false when a static PNG merely mentions acTL in tEXt data", () => {
			const comment = new TextEncoder().encode("Comment\0Made with acTL Studio");
			expect(isApngAnimated(png(IHDR, chunk("tEXt", comment), IDAT, IEND))).toBe(false);
		});

		// The old scan accumulated UTF-16 code-unit counts and compared them against
		// byte offsets, so multi-byte data ahead of acTL shrank the index. Past ~40
		// bytes of it the computed IDAT offset landed before acTL's real position,
		// the search window closed over the chunk, and a genuine APNG — one carrying
		// a compressed ICC profile, say — reported static.
		it.each([16, 40, 64, 128, 256, 1024])(
			"returns true for an APNG behind %i bytes of two-byte UTF-8",
			(size) => {
				const profile = chunk("iCCP", twoByteUtf8(size));
				expect(isApngAnimated(png(IHDR, profile, ACTL, IDAT, IEND))).toBe(true);
			},
		);

		it.each([16, 40, 64, 128, 256, 1024])(
			"returns true for an APNG behind %i bytes of four-byte UTF-8",
			(size) => {
				const profile = chunk("iCCP", fourByteUtf8(size));
				expect(isApngAnimated(png(IHDR, profile, ACTL, IDAT, IEND))).toBe(true);
			},
		);

		it("returns true when the profile spans the old 1024-byte scan window", () => {
			const profile = chunk("iCCP", twoByteUtf8(4096));
			expect(isApngAnimated(png(IHDR, profile, ACTL, IDAT, IEND))).toBe(true);
		});
	});

	describe("terminates on malformed chunk lengths", () => {
		it("returns false for a declared length above the specification cap", () => {
			const bytes = new Uint8Array([
				...SIGNATURE,
				0xff,
				0xff,
				0xff,
				0xf4,
				0x61,
				0x61,
				0x61,
				0x61,
				0,
				0,
				0,
				0,
			]);
			expect(isApngAnimated(bytes.buffer)).toBe(false);
		});

		it("returns false for a chunk that would run past the end of the data", () => {
			const bytes = new Uint8Array([
				...SIGNATURE,
				0x7f,
				0xff,
				0xff,
				0xff,
				0x61,
				0x61,
				0x61,
				0x61,
				0,
				0,
				0,
				0,
			]);
			expect(isApngAnimated(bytes.buffer)).toBe(false);
		});

		it("returns false for a stream truncated part-way through acTL", () => {
			const truncated = new Uint8Array(png(IHDR, ACTL, IDAT, IEND)).slice(0, 38);
			expect(isApngAnimated(truncated.buffer)).toBe(false);
		});

		it("terminates on arbitrary bytes behind a valid signature", () => {
			const junk = new Uint8Array(4096);
			for (let i = 0; i < junk.length; i++) junk[i] = (i * 37) & 0xff;
			junk.set(SIGNATURE, 0);
			expect(isApngAnimated(junk.buffer)).toBe(false);
		});

		it("terminates on a run of zero-length chunks", () => {
			const empties = Array.from({ length: 512 }, () => chunk("tEXt"));
			expect(isApngAnimated(png(IHDR, ...empties, IDAT))).toBe(false);
		});
	});
});
