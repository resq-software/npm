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
import { isGIF, isGifAnimated } from "../../../src/browser/media/gif.js";

describe("isGIF", () => {
	it("should return true for valid GIF header", () => {
		const buffer = new ArrayBuffer(10);
		const view = new Uint8Array(buffer);

		// Set GIF header "GIF"
		view[0] = 71; // G
		view[1] = 73; // I
		view[2] = 70; // F

		expect(isGIF(buffer)).toBe(true);
	});

	it("should return false for non-GIF header", () => {
		const buffer = new ArrayBuffer(10);
		const view = new Uint8Array(buffer);

		// Set PNG header instead
		view[0] = 137; // PNG signature
		view[1] = 80; // P
		view[2] = 78; // N

		expect(isGIF(buffer)).toBe(false);
	});

	it("should return false for empty buffer", () => {
		const buffer = new ArrayBuffer(0);
		expect(isGIF(buffer)).toBe(false);
	});
});

describe("isGifAnimated", () => {
	it("should return false for non-GIF data", () => {
		const buffer = new ArrayBuffer(20);
		const view = new Uint8Array(buffer);

		// Set non-GIF header
		view[0] = 80; // P
		view[1] = 78; // N
		view[2] = 71; // G

		expect(isGifAnimated(buffer)).toBe(false);
	});

	it("should return false for empty buffer", () => {
		const buffer = new ArrayBuffer(0);
		expect(isGifAnimated(buffer)).toBe(false);
	});

	it("should return false for a valid GIF header but truncated buffer (< 13 bytes)", () => {
		// A GIF header is present but the buffer is shorter than the logical
		// screen descriptor, so parsing must bail out instead of reading OOB.
		const buffer = new ArrayBuffer(6);
		const view = new Uint8Array(buffer);
		view[0] = 71; // G
		view[1] = 73; // I
		view[2] = 70; // F
		view[3] = 56; // 8
		view[4] = 57; // 9
		view[5] = 97; // a

		expect(isGifAnimated(buffer)).toBe(false);
	});
});
