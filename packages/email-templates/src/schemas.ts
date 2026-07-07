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

import { Schema as S } from "effect";

/**
 * A non-empty, absolute http(s) URL. Validated with a pattern check (blocks
 * `javascript:`/relative hrefs) but decoded as a plain `string`, so template
 * props stay ergonomic. Exported for consumers building their own templates.
 */
export const HttpUrl = S.String.check(S.isPattern(/^https?:\/\/\S+$/i));

export const otpData = S.Struct({
	code: S.NonEmptyString,
	firstName: S.optional(S.String),
	expiresInMinutes: S.optional(S.Number),
});

export const welcomeData = S.Struct({
	firstName: S.NonEmptyString,
	verifyUrl: S.optional(HttpUrl),
});

export const passwordResetData = S.Struct({
	firstName: S.optional(S.String),
	resetUrl: HttpUrl,
	expiresInMinutes: S.optional(S.Number),
});

export const notificationData = S.Struct({
	title: S.NonEmptyString,
	body: S.NonEmptyString,
	severity: S.optional(S.Literals(["info", "success", "warning", "error"])),
	actionUrl: S.optional(HttpUrl),
	actionLabel: S.optional(S.String),
});

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

/** Inferred `data` types for the built-in templates (used for component props). */
export type OtpData = typeof otpData.Type;
export type WelcomeData = typeof welcomeData.Type;
export type PasswordResetData = typeof passwordResetData.Type;
export type NotificationData = typeof notificationData.Type;
export type IncidentAlertData = typeof incidentAlertData.Type;
