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

describe("isAvifAnimated", () => {
	it("returns true when 4th byte equals 44", () => {
		const buffer = new ArrayBuffer(10);
		const view = new Uint8Array(buffer);
		view[3] = 44;

		expect(isAvifAnimated(buffer)).toBe(true);
	});

	it("returns false when 4th byte is not 44", () => {
		const buffer = new ArrayBuffer(10);
		const view = new Uint8Array(buffer);
		view[3] = 43;

		expect(isAvifAnimated(buffer)).toBe(false);
	});

	it("returns false for buffer smaller than 4 bytes", () => {
		const buffer = new ArrayBuffer(3);
		// Accessing index 3 should return undefined, which !== 44
		expect(isAvifAnimated(buffer)).toBe(false);
	});
});
