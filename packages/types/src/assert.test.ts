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

import { describe, expect, test } from "vitest";
import { assertNever, assertUnreachable } from "./assert.js";

type Kind = "a" | "b";

function handle(kind: Kind): string {
	switch (kind) {
		case "a":
			return "A";
		case "b":
			return "B";
		default:
			return assertNever(kind);
	}
}

describe("assertNever", () => {
	test("is unreachable for a fully-handled union", () => {
		expect(handle("a")).toBe("A");
		expect(handle("b")).toBe("B");
	});

	test("throws when reached at runtime via an untyped caller", () => {
		// Simulate a value the type system said could not occur.
		expect(() => handle("c" as Kind)).toThrow(/Unreachable/);
	});

	test("uses a custom message when provided", () => {
		expect(() => assertNever("x" as never, "custom boom")).toThrow("custom boom");
	});

	test("assertUnreachable is an alias", () => {
		expect(assertUnreachable).toBe(assertNever);
	});
});
