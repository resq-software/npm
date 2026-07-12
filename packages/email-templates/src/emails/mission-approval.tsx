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

import type { MissionApprovalData } from "../schemas.js";
import { Email } from "./primitives.js";

export type MissionApprovalEmailProps = MissionApprovalData;

const severityClass: Record<"info" | "warning" | "critical", string> = {
	info: "text-info",
	warning: "text-warning",
	critical: "text-danger",
};

/** Approver sign-off request for a ResQ Systems mission / plan execution. */
export function MissionApprovalEmail({
	missionId,
	title,
	summary,
	requestedBy,
	severity,
	approveUrl = "https://app.example.com/missions/approve",
	expiresInMinutes,
}: MissionApprovalEmailProps) {
	const meta = [`Mission ${missionId}`, requestedBy ? `Requested by ${requestedBy}` : null]
		.filter(Boolean)
		.join(" · ");

	return (
		<Email.Shell preview={`Mission approval needed: ${title}`}>
			<Email.Header />
			{severity ? (
				<Email.Text
					className={`mb-2 font-mono text-xs font-medium uppercase tracking-wide ${severityClass[severity]}`}
				>
					{severity} priority
				</Email.Text>
			) : null}
			<Email.Title>{title}</Email.Title>
			<Email.Paragraph>A mission needs your sign-off before it can execute.</Email.Paragraph>
			{summary ? <Email.Paragraph>{summary}</Email.Paragraph> : null}
			<Email.Text className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
				{meta}
			</Email.Text>
			<Email.CTA href={approveUrl}>Review &amp; approve</Email.CTA>
			{expiresInMinutes ? (
				<Email.Paragraph>
					This approval request expires in {expiresInMinutes} minutes.
				</Email.Paragraph>
			) : null}
			<Email.LegalFooter
				category="transactional"
				reason="You are receiving this email because you are an approver for ResQ Systems mission operations."
			/>
		</Email.Shell>
	);
}
