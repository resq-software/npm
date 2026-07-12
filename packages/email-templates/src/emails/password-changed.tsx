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

import type { PasswordChangedData } from "../schemas.js";
import { Email } from "./primitives.js";

export type PasswordChangedEmailProps = PasswordChangedData;

/** Security notice confirming the account password was changed. */
export function PasswordChangedEmail({
	firstName,
	changedAt,
	secureAccountUrl,
}: PasswordChangedEmailProps) {
	return (
		<Email.Shell preview="Your ResQ Systems password was changed">
			<Email.Header />
			<Email.Title>Your password was changed</Email.Title>
			{firstName ? <Email.Paragraph>Hi {firstName},</Email.Paragraph> : null}
			<Email.Paragraph>
				The password on your ResQ Systems account was changed{changedAt ? ` on ${changedAt}` : ""}.
				If you made this change, no further action is needed.
			</Email.Paragraph>
			{secureAccountUrl ? (
				<>
					<Email.Paragraph>
						If you didn't change your password, your account may be at risk — secure it now.
					</Email.Paragraph>
					<Email.CTA href={secureAccountUrl}>Secure your account</Email.CTA>
				</>
			) : (
				<Email.Paragraph>
					If you didn't change your password, your account may be at risk. Please contact support
					immediately.
				</Email.Paragraph>
			)}
			<Email.SupportLine>Didn't change your password?</Email.SupportLine>
			<Email.LegalFooter
				category="transactional"
				reason="You are receiving this email because the password on your ResQ Systems account was changed."
			/>
		</Email.Shell>
	);
}
