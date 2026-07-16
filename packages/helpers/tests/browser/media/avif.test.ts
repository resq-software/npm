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
import { isAvifAnimated } from "../../../src/browser/media/avif.js";

/** Writes ASCII characters into `view` starting at `offset`. */
function writeAscii(view: Uint8Array, offset: number, text: string): void {
	for (let i = 0; i < text.length; i++) {
		view[offset + i] = text.charCodeAt(i);
	}
}

/**
 * Builds a minimal ISOBMFF `ftyp` box:
 * size(4) + "ftyp"(4) + majorBrand(4) + minorVersion(4) + compatibleBrands(4*n).
 */
function createFtyp(majorBrand: string, compatibleBrands: string[]): ArrayBuffer {
	const size = 16 + compatibleBrands.length * 4;
	const buffer = new ArrayBuffer(size);
	const view = new Uint8Array(buffer);

	// Box size (big-endian u32).
	view[0] = (size >> 24) & 0xff;
	view[1] = (size >> 16) & 0xff;
	view[2] = (size >> 8) & 0xff;
	view[3] = size & 0xff;

	writeAscii(view, 4, "ftyp");
	writeAscii(view, 8, majorBrand);
	// Bytes 12-15 (minor version) intentionally left as zero.
	compatibleBrands.forEach((brand, i) => writeAscii(view, 16 + i * 4, brand));

	return buffer;
}

describe("isAvifAnimated", () => {
	it("returns true when the major brand is the image-sequence brand 'avis'", () => {
		const buffer = createFtyp("avis", ["avif", "mif1", "miaf"]);
		expect(isAvifAnimated(buffer)).toBe(true);
	});

	it("returns true when 'avis' appears in the compatible brands", () => {
		const buffer = createFtyp("avif", ["mif1", "avis", "miaf"]);
		expect(isAvifAnimated(buffer)).toBe(true);
	});

	it("returns true for the 'msf1' image-sequence brand", () => {
		const buffer = createFtyp("avif", ["mif1", "msf1"]);
		expect(isAvifAnimated(buffer)).toBe(true);
	});

	it("returns false for a still AVIF (no image-sequence brand)", () => {
		const buffer = createFtyp("avif", ["avif", "mif1", "miaf"]);
		expect(isAvifAnimated(buffer)).toBe(false);
	});

	it("does not scan compatible brands past the declared ftyp box size", () => {
		// Declare a box size that excludes the trailing "avis" brand so it must
		// not be read as part of the ftyp compatible-brands list.
		const buffer = createFtyp("avif", ["mif1", "avis"]);
		const view = new Uint8Array(buffer);
		// Shrink the declared size to cover only up to the first compatible brand.
		const truncatedSize = 20;
		view[0] = 0;
		view[1] = 0;
		view[2] = 0;
		view[3] = truncatedSize;

		expect(isAvifAnimated(buffer)).toBe(false);
	});

	it("returns false when the first box is not 'ftyp'", () => {
		const buffer = createFtyp("avis", ["avif"]);
		const view = new Uint8Array(buffer);
		writeAscii(view, 4, "moov"); // corrupt the box type

		expect(isAvifAnimated(buffer)).toBe(false);
	});

	it("returns false for a buffer too small to contain a major brand", () => {
		const buffer = new ArrayBuffer(11);
		const view = new Uint8Array(buffer);
		writeAscii(view, 4, "ftyp");

		expect(isAvifAnimated(buffer)).toBe(false);
	});

	it("returns false for an empty buffer", () => {
		expect(isAvifAnimated(new ArrayBuffer(0))).toBe(false);
	});
});
