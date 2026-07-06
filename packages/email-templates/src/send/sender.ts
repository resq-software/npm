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

/** Provider-agnostic input for sending a single email. */
export interface SendEmailInput {
	from: string;
	to: string | string[];
	subject: string;
	html?: string;
	text?: string;
	replyTo?: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	/** Stable key so Resend de-dupes identical sends for 24h. */
	idempotencyKey?: string;
	/** Extra headers, e.g. RFC 8058 `List-Unsubscribe` for marketing mail. */
	headers?: Record<string, string>;
}

/** Normalized send result. Providers map their responses onto this shape. */
export type SendResult =
	| { ok: true; id: string }
	| { ok: false; error: { name: string; message: string } };

/**
 * Port for an email transport. Implement this to plug in any provider (Resend,
 * SES, Postmark, SMTP); the rest of the package depends only on this interface.
 */
export interface EmailSender {
	send(input: SendEmailInput): Promise<SendResult>;
}
