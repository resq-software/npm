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

import { afterEach, describe, expect, test } from "vitest";
import { mockUniqueId, restoreUniqueId, uniqueId } from "../../src/utils/id.js";

describe("mockUniqueId", () => {
	afterEach(() => {
		restoreUniqueId();
	});

	test("replaces uniqueId with custom implementation", () => {
		mockUniqueId(() => "test-id");

		expect(uniqueId()).toBe("test-id");
		expect(uniqueId(10)).toBe("test-id");
	});
});

describe("restoreUniqueId", () => {
	test("restores original uniqueId behavior after mocking", () => {
		mockUniqueId(() => "mocked-id");
		expect(uniqueId()).toBe("mocked-id");

		restoreUniqueId();

		const id1 = uniqueId();
		const id2 = uniqueId();

		expect(id1).not.toBe("mocked-id");
		expect(id2).not.toBe("mocked-id");
		expect(id1).not.toBe(id2);
		expect(id1).toHaveLength(21);
	});
});
