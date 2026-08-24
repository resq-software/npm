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
 * @fileoverview Effect Schema building blocks for email payloads — validated URL and
 * recipient primitives, the send-category literal, and each built-in template's
 * `data` struct with its inferred type.
 *
 * @module @resq-systems/email-templates/schemas
 */

import { Schema as S } from "effect";

//#region Validation primitives

const HTTP_AUTHORITY_PREFIX = /^https?:\/\/[^/?#]+(?:[/?#]|$)/i;

function hasAsciiControlOrWhitespace(value: string): boolean {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code <= 0x20 || code === 0x7f) return true;
	}
	return false;
}

/**
 * A real absolute http(s) URL decoded as a plain string. Literal ASCII controls
 * and whitespace, hostless/repaired authorities, and credential-bearing URLs
 * are rejected before the value can reach an email href.
 */
export const HttpUrl = S.String.check(
	S.makeFilter(
		(value: string) => {
			if (hasAsciiControlOrWhitespace(value) || !HTTP_AUTHORITY_PREFIX.test(value)) {
				return false;
			}
			try {
				const parsed = new URL(value);
				return (
					(parsed.protocol === "http:" || parsed.protocol === "https:") &&
					parsed.hostname.length > 0 &&
					parsed.username === "" &&
					parsed.password === ""
				);
			} catch {
				return false;
			}
		},
		{
			message:
				"Expected an absolute http(s) URL without credentials, ASCII controls, or whitespace",
		},
	),
);

/**
 * A single, syntactically-valid recipient email address (branded).
 *
 * The pattern mirrors `@resq-systems/security`'s `EmailSchema` — one `@`, a
 * dotted domain, and a 2+ character TLD, or a Punycode/IDN `xn--…` TLD (e.g.
 * `.xn--p1ai` for `.рф`) so internationalized domains are not rejected. Because
 * the character classes admit no whitespace or control characters and the check
 * is anchored (`^…$`), it also rejects the CR/LF that underpins SMTP header
 * injection: a `to` smuggling `"…\r\nBcc: attacker@evil"` into a provider that
 * concatenates headers is a type-*and*-runtime error at the boundary, not a
 * silent extra recipient.
 *
 * The {@link EmailAddress} brand marks a string that has cleared this check, so
 * a validated address is not interchangeable with a raw `string` downstream
 * (the `to` field on the decoded mailer payload and the rendered email).
 */
export const EmailAddress = S.String.check(
	S.isPattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(?:[A-Za-z]{2,}|xn--[A-Za-z0-9-]+)$/),
).pipe(S.brand("EmailAddress"));

/** A recipient address that has passed {@link EmailAddress} validation. */
export type EmailAddress = typeof EmailAddress.Type;

/**
 * Compliance class of an email send. `transactional` skips unsubscribe UI;
 * `marketing` requires an unsubscribe affordance in the legal footer.
 */
export const emailCategory = S.Literals(["transactional", "marketing"]);
export type EmailCategory = typeof emailCategory.Type;

//#endregion

//#region Schemas

/** `data` schema for the one-time-code (OTP) email. */
export const otpData = S.Struct({
	code: S.NonEmptyString,
	firstName: S.optional(S.String),
	expiresInMinutes: S.optional(S.Number),
});

/** `data` schema for the account welcome / onboarding email. */
export const welcomeData = S.Struct({
	firstName: S.NonEmptyString,
	verifyUrl: S.optional(HttpUrl),
});

/** `data` schema for the password-reset email. */
export const passwordResetData = S.Struct({
	firstName: S.optional(S.String),
	resetUrl: HttpUrl,
	expiresInMinutes: S.optional(S.Number),
});

/** `data` schema for the generic notification / alert email. */
export const notificationData = S.Struct({
	title: S.NonEmptyString,
	body: S.NonEmptyString,
	severity: S.optional(S.Literals(["info", "success", "warning", "error"])),
	actionUrl: S.optional(HttpUrl),
	actionLabel: S.optional(S.String),
});

/** `data` schema for the incident / dispatch alert email. */
export const incidentAlertData = S.Struct({
	incidentId: S.NonEmptyString,
	title: S.NonEmptyString,
	severity: S.Literals(["info", "warning", "critical"]),
	summary: S.NonEmptyString,
	location: S.optional(S.String),
	// Preformatted timestamp string (caller formats/localizes) to avoid
	// timezone/format ambiguity inside the email.
	detectedAt: S.optional(S.String),
	dashboardUrl: HttpUrl,
});

/** `data` schema for the password-changed security notice. */
export const passwordChangedData = S.Struct({
	firstName: S.optional(S.String),
	// Preformatted timestamp string (caller formats/localizes).
	changedAt: S.optional(S.String),
	// Where to secure the account if the change was not authorized.
	secureAccountUrl: S.optional(HttpUrl),
});

/** `data` schema for the new-device sign-in security alert. */
export const newDeviceLoginData = S.Struct({
	firstName: S.optional(S.String),
	// Human-readable client, e.g. "Chrome on macOS".
	device: S.optional(S.String),
	// Human-readable place, e.g. "Newark, DE, USA".
	location: S.optional(S.String),
	ipAddress: S.optional(S.String),
	// Preformatted timestamp string (caller formats/localizes).
	at: S.optional(S.String),
	// Where to review activity / secure the account if the sign-in was not the recipient.
	secureAccountUrl: S.optional(HttpUrl),
});

/** `data` schema for the mission-approval sign-off request. */
export const missionApprovalData = S.Struct({
	missionId: S.NonEmptyString,
	title: S.NonEmptyString,
	summary: S.optional(S.String),
	requestedBy: S.optional(S.String),
	severity: S.optional(S.Literals(["info", "warning", "critical"])),
	// Approver sign-off link (e.g. the HCE mission-approval route).
	approveUrl: HttpUrl,
	expiresInMinutes: S.optional(S.Number),
});

/** `data` schema for the organization / team invitation email. */
export const orgInvitationData = S.Struct({
	orgName: S.NonEmptyString,
	inviterName: S.optional(S.String),
	orgRole: S.optional(S.String),
	acceptUrl: HttpUrl,
	expiresInDays: S.optional(S.Number),
});

//#endregion

//#region Types

/** Inferred `data` types for the built-in templates (used for component props). */
export type OtpData = typeof otpData.Type;
export type WelcomeData = typeof welcomeData.Type;
export type PasswordResetData = typeof passwordResetData.Type;
export type NotificationData = typeof notificationData.Type;
export type IncidentAlertData = typeof incidentAlertData.Type;
export type PasswordChangedData = typeof passwordChangedData.Type;
export type NewDeviceLoginData = typeof newDeviceLoginData.Type;
export type MissionApprovalData = typeof missionApprovalData.Type;
export type OrgInvitationData = typeof orgInvitationData.Type;

//#endregion
