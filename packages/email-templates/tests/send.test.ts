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

import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
	Resend: class {
		emails = { send: sendMock };
	},
}));

import { createResendSender } from "../src/send/resend-sender";
import { sendEmail } from "../src/send/send-email";
import type { EmailSender } from "../src/send/sender";

const input = { from: "ResQ Systems <a@b.com>", to: "c@d.com", subject: "Hi", html: "<b>hi</b>" };

describe("createResendSender", () => {
	beforeEach(() => sendMock.mockReset());

	it("throws when no API key is available", () => {
		expect(() => createResendSender(undefined)).toThrow(/RESEND_API_KEY/);
	});

	it("returns ok with the message id on success", async () => {
		sendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null });
		const result = await createResendSender("re_test").send(input);
		expect(result).toEqual({ ok: true, id: "msg_123" });
	});

	it("maps a Resend API error to ok:false", async () => {
		sendMock.mockResolvedValue({
			data: null,
			error: { name: "validation_error", message: "bad from" },
		});
		const result = await createResendSender("re_test").send(input);
		expect(result).toEqual({
			ok: false,
			error: { name: "validation_error", message: "bad from" },
		});
	});

	it("never throws on a transport failure", async () => {
		sendMock.mockImplementationOnce(async () => {
			throw new Error("network down");
		});
		const result = await createResendSender("re_test").send(input);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.name).toBe("transport_error");
			expect(result.error.message).toContain("network down");
		}
	});

	it("returns an error when Resend returns neither data nor error", async () => {
		sendMock.mockResolvedValue({ data: null, error: null });
		const result = await createResendSender("re_test").send(input);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.name).toBe("unknown_error");
	});

	it("forwards an idempotency key as the send option", async () => {
		sendMock.mockResolvedValue({ data: { id: "msg_9" }, error: null });
		await createResendSender("re_test").send({ ...input, idempotencyKey: "incident-1" });
		expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ subject: "Hi" }), {
			idempotencyKey: "incident-1",
		});
	});
});

describe("sendEmail", () => {
	// A sender that would succeed, so any failure result must come from rendering.
	const okSender: EmailSender = { send: async () => ({ ok: true, id: "msg_ok" }) };

	it("normalizes an invalid payload into a SendResult failure instead of throwing", async () => {
		const result = await sendEmail(
			okSender,
			{ name: "not-a-template" },
			{ from: "ResQ Systems <a@b.com>" },
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.name).toBe("EmailValidationError");
	});

	it("does not call the sender when the payload fails validation", async () => {
		const send = vi.fn(async () => ({ ok: true, id: "msg_x" }) as const);
		await sendEmail({ send }, {}, { from: "ResQ Systems <a@b.com>" });
		expect(send).not.toHaveBeenCalled();
	});

	it("normalizes a throwing sender into a SendResult failure", async () => {
		const throwingSender: EmailSender = {
			send: async () => {
				throw new Error("SMTP 500");
			},
		};
		const result = await sendEmail(
			throwingSender,
			{ name: "otp", to: "user@example.com", data: { code: "123456", firstName: "Ada" } },
			{ from: "ResQ Systems <a@b.com>" },
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.name).toBe("sender_error");
			expect(result.error.message).toContain("SMTP 500");
		}
	});
});
