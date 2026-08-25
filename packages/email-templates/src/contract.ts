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
 * @fileoverview Public payload contract for the built-in email templates — the
 * validated `{ name, to, data }` union plus name/data type helpers and the boundary
 * decoder.
 *
 * @module @resq-systems/email-templates/contract
 */

import { resqMailer } from "./suite.js";

export { EmailValidationError } from "./mailer.js";

/** Effect Schema union for every built-in ResQ Systems email `{ name, to, data }`. */
export const EmailPayload = resqMailer.schema;

/**
 * The validated payload type for the built-in ResQ Systems templates — the
 * discriminated `{ name, to, data, category?, unsubscribeUrl? }` union, keyed by
 * {@link EmailName}. Narrow on `name` to recover the matching `data` shape.
 */
export type EmailPayload = ReturnType<typeof resqMailer.decode>;

/** Every built-in template name (the {@link EmailPayload} union discriminant). */
export type EmailName = EmailPayload["name"];

/**
 * The `data` shape for a given built-in template name — the `data` field of the
 * {@link EmailPayload} variant whose discriminant equals `N`.
 *
 * @template N - The template name selecting a single variant's `data` shape.
 */
export type EmailTemplateData<N extends EmailName> = Extract<EmailPayload, { name: N }>["data"];

/**
 * Validate an untrusted `{ name, to, data }` payload at the system boundary.
 *
 * @param input - Untrusted value to validate against the built-in contract.
 * @returns The validated, branded {@link EmailPayload}.
 * @throws {EmailValidationError} If `input` matches no built-in template variant —
 *   unknown `name`, malformed/header-injecting `to`, missing marketing
 *   `unsubscribeUrl`, or `data` failing its schema.
 */
export const decodeEmailPayload = resqMailer.decode;
