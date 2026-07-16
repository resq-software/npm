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

describe("isApngAnimated", () => {
	it("returns false for empty ArrayBuffer", () => {
		const buffer = new ArrayBuffer(0);
		expect(isApngAnimated(buffer)).toBe(false);
	});

	it("returns false for buffer too small to be PNG", () => {
		const buffer = new ArrayBuffer(8);
		expect(isApngAnimated(buffer)).toBe(false);
	});

	it("returns false for non-PNG data", () => {
		const buffer = new ArrayBuffer(20);
		const view = new Uint8Array(buffer);
		// JPEG signature instead
		view.set([0xff, 0xd8, 0xff, 0xe0]);
		expect(isApngAnimated(buffer)).toBe(false);
	});

	it("returns false for regular PNG with IDAT but no acTL", () => {
		const buffer = new ArrayBuffer(100);
		const view = new Uint8Array(buffer);

		// PNG signature
		view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

		// Add IDAT chunk at position 20
		view.set(new TextEncoder().encode("IDAT"), 20);

		expect(isApngAnimated(buffer)).toBe(false);
	});

	it("returns false when acTL comes after IDAT", () => {
		const buffer = new ArrayBuffer(100);
		const view = new Uint8Array(buffer);

		// PNG signature
		view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

		// IDAT chunk at position 20
		view.set(new TextEncoder().encode("IDAT"), 20);

		// acTL chunk after IDAT - should not count as animated
		view.set(new TextEncoder().encode("acTL"), 30);

		expect(isApngAnimated(buffer)).toBe(false);
	});

	it("returns true for APNG with acTL before IDAT", () => {
		const buffer = new ArrayBuffer(100);
		const view = new Uint8Array(buffer);

		// PNG signature
		view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

		// acTL chunk before IDAT
		view.set(new TextEncoder().encode("acTL"), 15);

		// IDAT chunk
		view.set(new TextEncoder().encode("IDAT"), 30);

		expect(isApngAnimated(buffer)).toBe(true);
	});
});
