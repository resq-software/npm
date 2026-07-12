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
import { type Brand, brandRefiner, unsafeBrand } from "./brand.js";

type Email = Brand<string, "Email">;
const Email = brandRefiner<string, "Email">((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s), "email");

describe("brandRefiner", () => {
	test("is() acts as a runtime type guard", () => {
		expect(Email.is("a@b.com")).toBe(true);
		expect(Email.is("nope")).toBe(false);
	});

	test("from() returns the value unchanged when valid", () => {
		const value = "a@b.com";
		expect(Email.from(value)).toBe(value);
	});

	test("from() throws TypeError when invalid and does not leak the value", () => {
		expect(() => Email.from("nope")).toThrow(TypeError);
		expect(() => Email.from("secret@leak")).toThrow(/failed the email refinement/);
		// The offending value must not appear in the message.
		try {
			Email.from("secret@leak");
		} catch (error) {
			expect((error as Error).message).not.toContain("secret@leak");
		}
	});

	test("coerce() returns the value or null without throwing", () => {
		expect(Email.coerce("a@b.com")).toBe("a@b.com");
		expect(Email.coerce("nope")).toBeNull();
	});

	test("unsafe() brands without checking (identity at runtime)", () => {
		expect(Email.unsafe("not-an-email")).toBe("not-an-email");
	});
});

describe("unsafeBrand", () => {
	test("is an identity function at runtime", () => {
		const token = unsafeBrand<"SecureToken", string>("abc-123");
		expect(token).toBe("abc-123");
	});

	test("a branded value is still usable as its carrier type", () => {
		const email: Email = Email.from("a@b.com");
		const asString: string = email;
		expect(asString.toUpperCase()).toBe("A@B.COM");
	});
});
