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

import { describe, expect, it } from "vitest";
import { getFirstFromIterable } from "../../src/utils/iterable.js";

describe("getFirstFromIterable", () => {
	it("should get first item from Set", () => {
		const set = new Set([1, 2, 3]);
		expect(getFirstFromIterable(set)).toBe(1);
	});

	it("should get first value from Map", () => {
		const map = new Map([
			["a", 1],
			["b", 2],
		]);
		expect(getFirstFromIterable(map)).toBe(1);
	});

	it("should preserve insertion order", () => {
		const set = new Set();
		set.add("third");
		set.add("first");
		set.add("second");
		expect(getFirstFromIterable(set)).toBe("third");
	});

	it("should return undefined for an empty Set or Map", () => {
		expect(getFirstFromIterable(new Set())).toBeUndefined();
		expect(getFirstFromIterable(new Map())).toBeUndefined();
	});
});
