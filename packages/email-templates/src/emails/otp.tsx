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
 * @fileoverview One-time verification code (OTP) email component.
 *
 * @module @resq-systems/email-templates/emails/otp
 */

import type { OtpData } from "../schemas.js";
import { Email } from "./primitives.js";

/** Props for {@link OtpEmail} — the OTP template's validated `data`. */
export type OtpEmailProps = OtpData;

/**
 * One-time verification code email. Default prop values make it previewable via
 * `email dev`.
 */
export function OtpEmail({ code = "123456", firstName, expiresInMinutes = 10 }: OtpEmailProps) {
	return (
		<Email.Shell preview="Your ResQ Systems verification code">
			<Email.Header />
			<Email.Title>Verification code</Email.Title>
			{firstName ? <Email.Paragraph>Hi {firstName},</Email.Paragraph> : null}
			<Email.Paragraph>Use this one-time code to continue.</Email.Paragraph>
			<Email.Code>{code}</Email.Code>
			{expiresInMinutes ? (
				<Email.Paragraph>This code expires in {expiresInMinutes} minutes.</Email.Paragraph>
			) : null}
			<Email.Paragraph>If you didn't request this code, ignore this email.</Email.Paragraph>
			<Email.LegalFooter reason="You received this email because a verification code was requested for your account." />
		</Email.Shell>
	);
}
