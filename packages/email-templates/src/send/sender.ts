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
 * @fileoverview Provider-agnostic email transport port — the `EmailSender` interface
 * plus its normalized input and result shapes.
 *
 * @module @resq-systems/email-templates/send/sender
 */

/**
 * Provider-agnostic input for sending a single email.
 *
 * At least one of {@link SendEmailInput.html} or {@link SendEmailInput.text} should
 * be present, or the message has no body — the pipeline (`renderEmail`) always
 * supplies both. `to`, `cc`, and `bcc` accept one address or a list.
 */
export interface SendEmailInput {
	/** Verified sender address, e.g. "ResQ Systems <ops@send.resq.software>". */
	from: string;
	/** Primary recipient(s); at least one address. */
	to: string | string[];
	subject: string;
	/** HTML body; omit only if `text` is provided. */
	html?: string;
	/** Plain-text body; omit only if `html` is provided. */
	text?: string;
	replyTo?: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	/** Stable key so Resend de-dupes identical sends for 24h. */
	idempotencyKey?: string;
	/** Extra headers, e.g. RFC 8058 `List-Unsubscribe` for marketing mail. */
	headers?: Record<string, string>;
}

/**
 * Normalized send result — a discriminated union keyed by the `ok` boolean.
 * Providers map their responses onto this shape so callers branch on `ok` rather
 * than on provider specifics.
 *
 * When `ok` is `true`, `id` is the provider's message id. When `ok` is `false`,
 * `error.name` is a stable, machine-branchable tag and `error.message` is a
 * human-readable detail.
 */
export type SendResult =
	| { ok: true; id: string }
	| { ok: false; error: { name: string; message: string } };

/**
 * Port for an email transport. Implement this to plug in any provider (Resend,
 * SES, Postmark, SMTP); the rest of the package depends only on this interface.
 */
export interface EmailSender {
	/**
	 * Send one email. Implementations SHOULD normalize transport/API failures into
	 * a `{ ok: false, error }` result rather than throwing (the bundled Resend
	 * adapter does). `sendEmail` still guards against a throwing sender, but
	 * honoring this contract keeps the failure `name`/`message` provider-accurate.
	 */
	send(input: SendEmailInput): Promise<SendResult>;
}
