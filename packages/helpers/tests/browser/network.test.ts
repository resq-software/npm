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
import { describe, expect, it, vi } from "vitest";
import { fetch, Image } from "../../src/browser/network.js";

describe("fetch", () => {
	it("should call window.fetch with referrerPolicy set to strict-origin-when-cross-origin", async () => {
		const mockFetch = vi.spyOn(window, "fetch").mockResolvedValue(new Response("test"));

		await fetch("https://example.com");

		expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
			referrerPolicy: "strict-origin-when-cross-origin",
		});
		mockFetch.mockRestore();
	});

	it("should override referrerPolicy if provided in init options", async () => {
		const mockFetch = vi.spyOn(window, "fetch").mockResolvedValue(new Response("test"));

		const initOptions: RequestInit = {
			referrerPolicy: "no-referrer",
		};

		await fetch("https://example.com", initOptions);

		expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
			referrerPolicy: "no-referrer",
		});
		mockFetch.mockRestore();
	});
});

describe("Image", () => {
	it("should create an image with referrerPolicy set to strict-origin-when-cross-origin", () => {
		const img = Image();

		expect(img.referrerPolicy).toBe("strict-origin-when-cross-origin");
	});
});
