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
import { sortById } from "../../src/utils/sort.js";

describe("sortById", () => {
	it("sorts objects with string ids in ascending order", () => {
		const items = [
			{ id: "c", name: "Charlie" },
			{ id: "a", name: "Alice" },
			{ id: "b", name: "Bob" },
		];

		const sorted = items.sort(sortById);

		expect(sorted).toEqual([
			{ id: "a", name: "Alice" },
			{ id: "b", name: "Bob" },
			{ id: "c", name: "Charlie" },
		]);
	});

	it("sorts objects with numeric ids in ascending order", () => {
		const items = [
			{ id: 3, label: "three" },
			{ id: 1, label: "one" },
			{ id: 2, label: "two" },
		];

		const sorted = items.sort(sortById);

		expect(sorted).toEqual([
			{ id: 1, label: "one" },
			{ id: 2, label: "two" },
			{ id: 3, label: "three" },
		]);
	});
});
