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

import type { WelcomeData } from "../schemas.js";
import { Email } from "./primitives.js";

export type WelcomeEmailProps = WelcomeData;

/** Account welcome / onboarding email. */
export function WelcomeEmail({ firstName = "there", verifyUrl }: WelcomeEmailProps) {
	return (
		<Email.Shell preview={`Welcome to ResQ, ${firstName}`}>
			<Email.Header />
			<Email.Title>Welcome to ResQ</Email.Title>
			<Email.Paragraph>Hi {firstName},</Email.Paragraph>
			<Email.Paragraph>
				Thanks for creating an account. Everything is set up and ready when you are.
			</Email.Paragraph>
			{verifyUrl ? (
				<>
					<Email.Paragraph>
						Confirm your email address to finish setting up your account.
					</Email.Paragraph>
					<Email.CTA href={verifyUrl}>Verify email</Email.CTA>
				</>
			) : null}
			<Email.Signature />
			<Email.LegalFooter
				category="transactional"
				reason="You are receiving this email because you created a ResQ account."
			/>
		</Email.Shell>
	);
}
