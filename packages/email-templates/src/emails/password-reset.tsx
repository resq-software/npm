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
		<Email.Shell preview="Reset your ResQ password">
			<Email.Title>Reset your password</Email.Title>
			{firstName ? <Email.Paragraph>Hi {firstName},</Email.Paragraph> : null}
			<Email.Paragraph>
				We received a request to reset your password. This link expires in {expiresInMinutes}{" "}
				minutes.
			</Email.Paragraph>
			<Email.CTA href={resetUrl}>Reset password</Email.CTA>
			<Email.Footer>
				If you did not request a password reset, you can safely ignore this email. ResQ Software.
			</Email.Footer>
		</Email.Shell>
	);
}
