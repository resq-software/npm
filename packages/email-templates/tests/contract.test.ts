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

import { describe, expect, it } from "vitest";
import { decodeEmailPayload, EmailValidationError } from "../src/contract";

describe("decodeEmailPayload", () => {
	it("accepts a valid welcome payload", () => {
		const payload = decodeEmailPayload({
			name: "welcome",
			to: "user@example.com",
			data: { firstName: "Grace" },
		});

		expect(payload.name).toBe("welcome");
		if (payload.name === "welcome") {
			expect(payload.data.firstName).toBe("Grace");
		}
	});

	it("accepts a notification payload with an optional severity", () => {
		const payload = decodeEmailPayload({
			name: "notification",
			to: "ops@example.com",
			data: { title: "Alert", body: "Something happened", severity: "warning" },
		});

		expect(payload.name).toBe("notification");
	});

	it("throws EmailValidationError on an unknown template name", () => {
		expect(() => decodeEmailPayload({ name: "nope", to: "x@y.com", data: {} })).toThrow(
			EmailValidationError,
		);
	});

	it("throws EmailValidationError when required data is missing", () => {
		expect(() => decodeEmailPayload({ name: "password-reset", to: "x@y.com", data: {} })).toThrow(
			EmailValidationError,
		);
	});

	it("throws EmailValidationError when a required string is empty", () => {
		expect(() => decodeEmailPayload({ name: "otp", to: "x@y.com", data: { code: "" } })).toThrow(
			EmailValidationError,
		);
	});

	it("throws EmailValidationError when a url field is not a valid http(s) url", () => {
		expect(() =>
			decodeEmailPayload({
				name: "password-reset",
				to: "x@y.com",
				data: { resetUrl: "javascript:alert(1)" },
			}),
		).toThrow(EmailValidationError);
	});

	it("throws EmailValidationError when the recipient is not a valid email", () => {
		// Valid data isolates the failure to the recipient check.
		expect(() =>
			decodeEmailPayload({ name: "welcome", to: "not-an-email", data: { firstName: "Grace" } }),
		).toThrow(EmailValidationError);
	});

	it("rejects a recipient carrying a CR/LF header-injection payload", () => {
		expect(() =>
			decodeEmailPayload({
				name: "welcome",
				to: "grace@example.com\r\nBcc: attacker@evil.test",
				data: { firstName: "Grace" },
			}),
		).toThrow(EmailValidationError);
	});

	it("accepts a well-formed plus-tagged recipient", () => {
		const payload = decodeEmailPayload({
			name: "welcome",
			to: "grace+alerts@example.com",
			data: { firstName: "Grace" },
		});

		expect(payload.to).toBe("grace+alerts@example.com");
	});
});
