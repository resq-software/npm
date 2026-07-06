/**
 * Copyright 2026 ResQ Software
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

const input = { from: "ResQ <a@b.com>", to: "c@d.com", subject: "Hi", html: "<b>hi</b>" };

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
