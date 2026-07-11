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

import type { NewDeviceLoginData } from "../schemas.js";
import { Email } from "./primitives.js";

export type NewDeviceLoginEmailProps = NewDeviceLoginData;

/** Security alert: a new device or location signed in to the account. */
export function NewDeviceLoginEmail({
	firstName,
	device,
	location,
	ipAddress,
	at,
	secureAccountUrl,
}: NewDeviceLoginEmailProps) {
	const meta = [device, location, ipAddress, at].filter(Boolean).join(" · ");

	return (
		<Email.Shell preview="New sign-in to your ResQ account">
			<Email.Header />
			<Email.Title>New sign-in to your account</Email.Title>
			{firstName ? <Email.Paragraph>Hi {firstName},</Email.Paragraph> : null}
			<Email.Paragraph>We noticed a new sign-in to your ResQ account.</Email.Paragraph>
			{meta ? (
				<Email.Text className="mb-4 font-mono text-xs uppercase tracking-wide text-muted">
					{meta}
				</Email.Text>
			) : null}
			<Email.Paragraph>
				If this was you, no action is needed.{" "}
				{secureAccountUrl
					? "If you don't recognize this sign-in, secure your account now."
					: "If you don't recognize this sign-in, please contact support immediately."}
			</Email.Paragraph>
			{secureAccountUrl ? <Email.CTA href={secureAccountUrl}>Secure your account</Email.CTA> : null}
			<Email.SupportLine>Don't recognize this sign-in?</Email.SupportLine>
			<Email.LegalFooter
				category="transactional"
				reason="You are receiving this email because a new sign-in to your ResQ account was detected."
			/>
		</Email.Shell>
	);
}
