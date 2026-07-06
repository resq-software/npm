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

import { renderEmail } from "../render.js";
import type { EmailSender, SendResult } from "./sender.js";

export interface SendEmailOptions {
	/** Verified sender address, e.g. "ResQ <updates@send.resq.software>". */
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
	const { to, subject, html, text } = await renderEmail(payload);

	return sender.send({
		from: options.from,
		to,
		subject,
		html,
		text,
		replyTo: options.replyTo,
		idempotencyKey: options.idempotencyKey,
		headers: options.headers,
	});
}
