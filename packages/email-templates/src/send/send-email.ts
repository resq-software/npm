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

/**
 * @fileoverview Render-and-send convenience wiring — validates and renders a payload,
 * then hands it to an `EmailSender`, preserving the never-throws `SendResult`
 * contract.
 *
 * @module @resq-systems/email-templates/send/send-email
 */

import { EmailValidationError } from "../mailer.js";
import { renderEmail } from "../render.js";
import type { EmailSender, SendResult } from "./sender.js";

export interface SendEmailOptions {
	/** Verified sender address, e.g. "ResQ Systems <updates@send.resq.software>". */
	from: string;
	replyTo?: string | string[];
	/** Stable key so Resend de-dupes identical sends for 24h. */
	idempotencyKey?: string;
	/** Extra headers passed through to the sender. */
	headers?: Record<string, string>;
}

/**
 * Render a validated payload and hand it to a sender in one call. Convenience
 * wiring for the common pipeline case: `sendEmail(sender, payload, { from })`.
 */
export async function sendEmail(
	sender: EmailSender,
	payload: unknown,
	options: SendEmailOptions,
): Promise<SendResult> {
	let rendered: Awaited<ReturnType<typeof renderEmail>>;
	try {
		rendered = await renderEmail(payload);
	} catch (err) {
		// Preserve the never-throws SendResult contract (see the sender adapters):
		// an invalid payload — or any other render failure — becomes a failure
		// result instead of a rejected promise, so pipeline callers that only
		// branch on `SendResult` never hit an unhandled rejection.
		// EmailValidationError keeps its name so callers can tell a bad payload
		// apart from an unexpected render error.
		if (err instanceof EmailValidationError) {
			return { ok: false, error: { name: err.name, message: err.message } };
		}
		return {
			ok: false,
			error: {
				name: "render_error",
				message: err instanceof Error ? err.message : String(err),
			},
		};
	}

	try {
		return await sender.send({
			from: options.from,
			to: rendered.to,
			subject: rendered.subject,
			html: rendered.html,
			text: rendered.text,
			replyTo: options.replyTo,
			idempotencyKey: options.idempotencyKey,
			headers: options.headers,
		});
	} catch (err) {
		// EmailSender.send is expected to normalize failures into SendResult, but a
		// third-party sender might still throw; keep sendEmail's never-throws
		// contract regardless, tagged distinctly so it isn't confused with a
		// render_error.
		return {
			ok: false,
			error: {
				name: "sender_error",
				message: err instanceof Error ? err.message : String(err),
			},
		};
	}
}
