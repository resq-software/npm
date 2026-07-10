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

import type { OrgInvitationData } from "../schemas.js";
import { Email } from "./primitives.js";

export type OrgInvitationEmailProps = OrgInvitationData;

/** Invitation to join a ResQ organization / team. */
export function OrgInvitationEmail({
	orgName,
	inviterName,
	role,
	acceptUrl = "https://app.resq.software/invitations/accept",
	expiresInDays,
}: OrgInvitationEmailProps) {
	const inviterPhrase = inviterName ? `${inviterName} invited you` : "You have been invited";
	const reason = inviterName
		? `You are receiving this email because ${inviterName} invited you to join ${orgName} on ResQ.`
		: `You are receiving this email because you were invited to join ${orgName} on ResQ.`;

	return (
		<Email.Shell preview={`You're invited to join ${orgName} on ResQ`}>
			<Email.Header />
			<Email.Title>You're invited to join {orgName}</Email.Title>
			<Email.Paragraph>
				{inviterPhrase} to join {orgName} on ResQ{role ? ` as ${role}` : ""}.
			</Email.Paragraph>
			<Email.CTA href={acceptUrl}>Accept invitation</Email.CTA>
			{expiresInDays ? (
				<Email.Paragraph>This invitation expires in {expiresInDays} days.</Email.Paragraph>
			) : null}
			<Email.Paragraph>Weren't expecting this? You can safely ignore this email.</Email.Paragraph>
			<Email.LegalFooter category="transactional" reason={reason} />
		</Email.Shell>
	);
}
