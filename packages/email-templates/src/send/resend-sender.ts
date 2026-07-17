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
 * @fileoverview Resend adapter implementing the `EmailSender` port — server-only,
 * normalizes API and transport failures into a `SendResult` instead of throwing.
 *
 * @module @resq-systems/email-templates/send/resend-sender
 */

import { Resend } from "resend";
import type { EmailSender, SendEmailInput, SendResult } from "./sender.js";

/**
 * Create an {@link EmailSender} backed by Resend.
 *
 * Server-only — never import this into a browser bundle or the API key leaks.
 * The key is read from the explicit argument or the `RESEND_API_KEY` env var and
 * validated up front (fail fast). Resend returns `{ data, error }` for API-level
 * failures rather than throwing, so we branch on `error` instead of try/catch.
 */
export function createResendSender(
	apiKey: string | undefined = process.env.RESEND_API_KEY,
): EmailSender {
	if (!apiKey) {
		throw new Error("RESEND_API_KEY is required to create a Resend sender");
	}

	const resend = new Resend(apiKey);

	return {
		async send(input: SendEmailInput): Promise<SendResult> {
			// `to`/`html`/`text` are always populated on the pipeline path (see
			// renderEmail); the localized cast keeps Resend's html|text|react union
			// happy without leaking `any`.
			const payload = {
				from: input.from,
				to: input.to,
				subject: input.subject,
				html: input.html,
				text: input.text,
				replyTo: input.replyTo,
				cc: input.cc,
				bcc: input.bcc,
				headers: input.headers,
			} as Parameters<typeof resend.emails.send>[0];

			const options = input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined;

			try {
				const { data, error } = await resend.emails.send(payload, options);

				if (error) {
					return { ok: false, error: { name: error.name, message: error.message } };
				}

				if (!data) {
					return {
						ok: false,
						error: { name: "unknown_error", message: "Resend returned no data and no error" },
					};
				}

				return { ok: true, id: data.id };
			} catch (err) {
				// The SDK returns { data, error } for API errors, but can still THROW
				// on transport failures (fetch rejection, DNS, aborted request), so the
				// whole call is wrapped to honor the never-throws contract of send().
				return {
					ok: false,
					error: {
						name: "transport_error",
						message: err instanceof Error ? err.message : String(err),
					},
				};
			}
		},
	};
}
