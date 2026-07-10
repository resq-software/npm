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

import type { PasswordResetData } from "../schemas.js";
import { Email } from "./primitives.js";

export type PasswordResetEmailProps = PasswordResetData;

/** Password reset email with a single call-to-action link. */
export function PasswordResetEmail({
	firstName,
	resetUrl = "https://app.resq.example/reset",
	expiresInMinutes = 30,
}: PasswordResetEmailProps) {
	return (
		<Email.Shell preview="Reset your password">
			<Email.Header />
			<Email.Title>Reset your password</Email.Title>
			{firstName ? <Email.Paragraph>Hi {firstName},</Email.Paragraph> : null}
			<Email.Paragraph>
				Someone requested a password reset for your account. Use the button below to choose a new
				password.
			</Email.Paragraph>
			<Email.CTA href={resetUrl}>Reset password</Email.CTA>
			<Email.Paragraph>This link expires in {expiresInMinutes} minutes.</Email.Paragraph>
			<Email.Paragraph>
				If you didn't request this, your password is unchanged and you can ignore this email. If
				you're concerned about unauthorized access, reset your password to secure your account.
			</Email.Paragraph>
			<Email.LegalFooter
				category="transactional"
				reason="You're receiving this email because a password reset was requested for your account."
			/>
		</Email.Shell>
	);
}
