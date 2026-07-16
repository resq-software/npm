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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { warnDeprecatedGetter, warnOnce } from "../../src/utils/warn.js";

describe("warn utilities", () => {
	let warnSpy = vi.spyOn(console, "warn");

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("should log a warning once and deduplicate subsequent calls", () => {
		warnOnce("hello world");
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining("WARN [helpers] hello world"));

		// Call again with same message
		warnOnce("hello world");
		expect(warnSpy).toHaveBeenCalledTimes(1);

		// Call with different message
		warnOnce("something else");
		expect(warnSpy).toHaveBeenCalledTimes(2);
		expect(warnSpy).toHaveBeenLastCalledWith(
			expect.stringContaining("WARN [helpers] something else"),
		);
	});

	it("should warn about deprecated getters and capitalize name", () => {
		warnDeprecatedGetter("viewport");
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenLastCalledWith(
			expect.stringContaining(
				"WARN [helpers] Using 'viewport' is deprecated and will be removed in the near future. Please refactor to use 'getViewport' instead.",
			),
		);
	});
});
