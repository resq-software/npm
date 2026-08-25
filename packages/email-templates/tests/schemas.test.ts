/**
 * Copyright 2026 ResQ Systems, Inc.
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

import { Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { HttpUrl } from "../src/schemas";

const decodeHttpUrl = Schema.decodeUnknownExit(HttpUrl);

const malformedHttpUrls = [
	["query without a host", "https://?"],
	["fragment without a host", "https://#"],
	["hostless absolute-looking path", "https:///path-only"],
	["credentials", "https://user:secret@example.com/path"],
	["literal ASCII whitespace", "https://example.com/has space"],
	["NUL control", "https://example.com/\u0000blocked"],
	["unit-separator control", "https://example.com/\u001fblocked"],
] as const;

describe("HttpUrl", () => {
	it.each(malformedHttpUrls)("rejects %s", (_label, value) => {
		expect(Exit.isFailure(decodeHttpUrl(value))).toBe(true);
	});

	it.each([
		"http://localhost:3000/path?query=value#fragment",
		"https://example.com/a%20path?next=https%3A%2F%2Fother.example#details",
		"https://[2001:db8::1]:8443/incidents/42",
	])("preserves a valid absolute URL: %s", (value) => {
		const result = decodeHttpUrl(value);

		expect(Exit.isSuccess(result)).toBe(true);
		if (Exit.isSuccess(result)) expect(result.value).toBe(value);
	});
});
