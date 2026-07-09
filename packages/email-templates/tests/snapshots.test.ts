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

import { describe, expect, it } from "vitest";
import type { EmailPayload } from "../src/contract";
import { renderEmail } from "../src/render";

/**
 * Deterministic HTML/text regression snapshots for every built-in template.
 *
 * React Email renders headlessly and deterministically for fixed input, so a
 * committed snapshot of `{ subject, html, text }` catches unintended structural
 * changes to the markup, inline styles, or plaintext fallback. When a change is
 * intentional, re-baseline with `bun --filter @resq-sw/email-templates test -u`
 * and review the diff.
 */
const cases: readonly EmailPayload[] = [
	{
		name: "otp",
		to: "user@example.com",
		data: { code: "123456", firstName: "Ada", expiresInMinutes: 10 },
	},
	{
		name: "welcome",
		to: "user@example.com",
		data: { firstName: "Ada", verifyUrl: "https://app.resq.software/verify?token=welcome-abc" },
	},
	{
		name: "password-reset",
		to: "user@example.com",
		data: {
			firstName: "Ada",
			resetUrl: "https://app.resq.software/reset?token=reset-abc",
			expiresInMinutes: 30,
		},
	},
	{
		name: "notification",
		to: "ops@example.com",
		data: {
			title: "Deploy finished",
			body: "Your deployment completed successfully.",
			severity: "success",
			actionUrl: "https://app.resq.software/deploys/1",
			actionLabel: "View deploy",
		},
	},
	{
		name: "incident-alert",
		to: "oncall@example.com",
		data: {
			incidentId: "INC-2048",
			title: "Wildfire perimeter breach",
			severity: "critical",
			summary: "Fire crossed the northern containment line near Sector 7.",
			location: "Sector 7 · North Ridge",
			detectedAt: "2026-07-09 14:32 PT",
			dashboardUrl: "https://app.resq.software/incidents/INC-2048",
		},
	},
];

describe("email template snapshots", () => {
	for (const payload of cases) {
		it(`renders "${payload.name}" deterministically`, async () => {
			const { subject, html, text } = await renderEmail(payload);

			expect(subject).toMatchSnapshot();
			expect(html).toMatchSnapshot();
			expect(text).toMatchSnapshot();
		});
	}
});
