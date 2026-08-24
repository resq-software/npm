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
 * @fileoverview Incident / dispatch alert email component for ResQ Systems
 * disaster-response operators.
 *
 * @module @resq-systems/email-templates/emails/incident-alert
 */

import type { IncidentAlertData } from "../schemas.js";
import { Email } from "./primitives.js";

/** Props for {@link IncidentAlertEmail} — the incident-alert template's validated `data`. */
export type IncidentAlertEmailProps = IncidentAlertData;

const severityClass: Record<"info" | "warning" | "critical", string> = {
	info: "text-info",
	warning: "text-warning",
	critical: "text-danger",
};

/** Incident / dispatch alert for ResQ Systems disaster-response operators. */
export function IncidentAlertEmail({
	incidentId,
	title,
	severity = "warning",
	summary,
	location,
	detectedAt,
	dashboardUrl = "https://app.resq.software/incidents",
}: IncidentAlertEmailProps) {
	const meta = [`Incident ${incidentId}`, location, detectedAt].filter(Boolean).join(" · ");

	return (
		<Email.Shell preview={`[${severity.toUpperCase()}] ${title}`}>
			<Email.Header />
			<Email.Text
				className={`mb-2 font-mono text-xs font-medium uppercase tracking-wide ${severityClass[severity]}`}
			>
				{severity} incident
			</Email.Text>
			<Email.Title>{title}</Email.Title>
			<Email.Paragraph>{summary}</Email.Paragraph>
			<Email.Text className="resq-email-muted mb-2 font-mono text-xs uppercase tracking-wide text-muted">
				{meta}
			</Email.Text>
			<Email.CTA href={dashboardUrl}>Open incident dashboard</Email.CTA>
			<Email.LegalFooter
				category="transactional"
				reason="You are receiving this alert because you are on-call for ResQ Systems disaster response."
			/>
		</Email.Shell>
	);
}
