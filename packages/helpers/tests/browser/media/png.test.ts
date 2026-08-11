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
import { PngHelpers } from "../../../src/browser/media/png.js";

/** One chunk: declared length, four-character type, and payload bytes. */
type Chunk = readonly [length: number, type: string, data: readonly number[]];

/**
 * Assemble a PNG from a signature and a chunk list.
 *
 * The declared length is written verbatim rather than derived from `data`, so a test
 * can state a length that disagrees with the payload — which is the whole point here.
 */
const buildPng = (chunks: readonly Chunk[]): DataView => {
	const bytes: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for (const [length, type, data] of chunks) {
		bytes.push((length >>> 24) & 255, (length >>> 16) & 255, (length >>> 8) & 255, length & 255);
		for (const character of type) bytes.push(character.charCodeAt(0));
		bytes.push(...data, 0, 0, 0, 0);
	}
	return new DataView(Uint8Array.from(bytes).buffer);
};

const IHDR: Chunk = [13, "IHDR", new Array(13).fill(0)];
const IEND: Chunk = [0, "IEND", []];

describe("PngHelpers.readChunks", () => {
	it("rejects input that is not a PNG", () => {
		const notPng = new DataView(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]).buffer);
		expect(() => PngHelpers.readChunks(notPng)).toThrow("Not a PNG");
	});

	it("reads chunk offsets from a well-formed PNG", () => {
		const png = buildPng([
			IHDR,
			[9, "pHYs", [0, 0, 0x16, 0x25, 0, 0, 0x16, 0x25, 1]],
			[18, "IDAT", new Array(18).fill(0)],
			IEND,
		]);

		expect(PngHelpers.readChunks(png)).toEqual({
			IHDR: { start: 8, dataOffset: 16, size: 13 },
			pHYs: { start: 33, dataOffset: 41, size: 9 },
			IDAT: { start: 54, dataOffset: 62, size: 18 },
		});
	});

	it("keeps the first IDAT and skips later ones", () => {
		const png = buildPng([IHDR, [2, "IDAT", [1, 2]], [2, "IDAT", [3, 4]], IEND]);
		expect(PngHelpers.readChunks(png).IDAT).toEqual({ start: 33, dataOffset: 41, size: 2 });
	});

	it("stops at IEND", () => {
		const png = buildPng([IHDR, IEND, [9, "pHYs", new Array(9).fill(0)]]);
		expect(PngHelpers.readChunks(png).pHYs).toBeUndefined();
	});

	// Regression. Read as a *signed* int, a declared length of 0xFFFFFFF4 decodes to
	// -12, and the old `offset += len + LEN_SIZE + CRC_SIZE` advanced by -4 — exactly
	// cancelling the +4 before it. Offset 8 was a fixed point, so this 70-byte
	// structurally-valid PNG spun forever and hung the calling thread. `getImageSize`
	// wraps the call in a try/catch, which cannot catch a hang.
	it.each([
		["negative-decoding fixed point", 0xfffffff4],
		["all bits set", 0xffffffff],
		["negative sixteen", 0xfffffff0],
		["largest in-range length", 0x7ffffffe],
	])("terminates on a hostile chunk length: %s", (_label, length) => {
		const png = buildPng([IHDR, [1, "IDAT", [0]], [length, "tEXt", []], IEND]);

		const started = performance.now();
		const chunks = PngHelpers.readChunks(png);
		const elapsed = performance.now() - started;

		expect(elapsed).toBeLessThan(100);
		// It must also fail closed: nothing past the malformed chunk is trusted.
		expect(chunks.tEXt).toBeUndefined();
	});

	it("stops when a declared length runs past the end of the data", () => {
		const png = buildPng([IHDR, [9999, "pHYs", [1, 2, 3]]]);
		expect(PngHelpers.readChunks(png)).toEqual({
			IHDR: { start: 8, dataOffset: 16, size: 13 },
		});
	});

	it("reads only within the DataView window, not the whole buffer", () => {
		const full = buildPng([IHDR, [9, "pHYs", new Array(9).fill(0)], IEND]);
		// A window ending mid-pHYs must not report a chunk it cannot fully see.
		const windowed = new DataView(full.buffer, 0, 36);
		expect(PngHelpers.readChunks(windowed).pHYs).toBeUndefined();
	});
});

describe("PngHelpers.findChunk", () => {
	it("returns the requested chunk", () => {
		const png = buildPng([IHDR, [9, "pHYs", new Array(9).fill(0)], IEND]);
		expect(PngHelpers.findChunk(png, "pHYs")).toEqual({
			start: 33,
			dataOffset: 41,
			size: 9,
		});
	});

	it("returns undefined when the chunk is absent", () => {
		expect(PngHelpers.findChunk(buildPng([IHDR, IEND]), "pHYs")).toBeUndefined();
	});

	it("terminates on the hostile length that previously hung it", () => {
		const png = buildPng([IHDR, [1, "IDAT", [0]], [0xfffffff4, "tEXt", []], IEND]);

		const started = performance.now();
		const result = PngHelpers.findChunk(png, "pHYs");
		const elapsed = performance.now() - started;

		expect(elapsed).toBeLessThan(100);
		expect(result).toBeUndefined();
	});
});
