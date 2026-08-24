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

import { describe, expect, it } from "vitest";
import { defaultEmailTheme } from "../src/emails/theme";
import { renderEmail } from "../src/render";

/**
 * Compliance-footer behavior for the expanded email templates.
 *
 * Every built-in template composes `Email.LegalFooter`, so a render must always
 * carry the registered legal entity, its postal address, and Terms/Privacy
 * links. Unsubscribe UI is gated on the send's compliance category: absent for
 * `transactional` (the default), present for `marketing`. These assertions are
 * intentionally structural (entity/address/URLs) rather than markup-exact — the
 * `toMatchSnapshot` regressions in `snapshots.test.ts` cover exact markup and
 * must be re-baselined with `vitest -u` after this footer change.
 */

const { org } = defaultEmailTheme;

/** One minimally-valid payload per built-in template (all default/transactional). */
const builtInPayloads = [
	{
		name: "otp",
		to: "user@example.com",
		data: { code: "123456", firstName: "Ada", expiresInMinutes: 10 },
	},
	{
		name: "welcome",
		to: "user@example.com",
		data: { firstName: "Ada", verifyUrl: "https://app.resq.software/verify?token=abc" },
	},
	{
		name: "password-reset",
		to: "user@example.com",
		data: {
			firstName: "Ada",
			resetUrl: "https://app.resq.software/reset?token=abc",
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
		},
	},
	{
		name: "incident-alert",
		to: "oncall@example.com",
		data: {
			incidentId: "INC-2048",
			title: "Wildfire perimeter breach",
			severity: "critical",
			summary: "Fire crossed the northern containment line.",
			dashboardUrl: "https://app.resq.software/incidents/INC-2048",
		},
	},
	{
		name: "password-changed",
		to: "user@example.com",
		data: { firstName: "Ada", changedAt: "2026-07-10 09:14 PT" },
	},
	{
		name: "new-device-login",
		to: "user@example.com",
		data: { firstName: "Ada", device: "Chrome on macOS", location: "Newark, DE, USA" },
	},
	{
		name: "mission-approval",
		to: "approver@example.com",
		data: {
			missionId: "MSN-4821",
			title: "Deploy swarm to Sector 7 wildfire",
			approveUrl: "https://app.example.com/missions/MSN-4821/approve",
		},
	},
	{
		name: "org-invitation",
		to: "invitee@example.com",
		data: {
			orgName: "Cascade County SAR",
			inviterName: "Dana Ruiz",
			acceptUrl: "https://app.resq.software/invitations/accept?token=demo",
		},
	},
] as const;

describe("legal footer", () => {
	it("sources the ResQ Systems, Inc. legal entity and legal URLs from the theme", () => {
		// Pin the theme values the footer relies on so the per-template
		// assertions below stay meaningful even if the tokens move.
		expect(org.legalName).toBe("ResQ Systems, Inc.");
		expect(org.registeredAddress).toContain("ResQ Systems, Inc.");
		expect(org.termsUrl).toBe("https://resq.software/legal/terms");
		expect(org.privacyUrl).toBe("https://resq.software/legal/privacy");
	});

	for (const payload of builtInPayloads) {
		describe(`"${payload.name}" template`, () => {
			it("renders the legal entity name and registered postal address", async () => {
				const { html } = await renderEmail(payload);

				expect(html).toContain(org.legalName);
				expect(html).toContain(org.registeredAddress);
			});

			it("renders Terms and Privacy links in the footer", async () => {
				const { html } = await renderEmail(payload);

				expect(html).toContain(org.termsUrl);
				expect(html).toContain(org.privacyUrl);
				expect(html).toContain(">Terms<");
				expect(html).toContain(">Privacy<");
			});

			it('no longer contains the legacy hardcoded "ResQ Software." footer string', async () => {
				const { html, text } = await renderEmail(payload);

				expect(html).not.toContain("ResQ Software.");
				expect(text).not.toContain("ResQ Software.");
			});

			it("omits the unsubscribe affordance for a default transactional send", async () => {
				const { html } = await renderEmail(payload);

				expect(html.toLowerCase()).not.toContain("unsubscribe");
			});
		});
	}
});

describe("unsubscribe affordance", () => {
	const unsubscribeUrl = "https://app.resq.software/unsubscribe?token=abc123";
	const preferencesUrl = "https://app.resq.software/preferences?token=abc123";

	for (const payload of builtInPayloads) {
		it(`renders both marketing controls for the "${payload.name}" template`, async () => {
			const { html, text } = await renderEmail({
				...payload,
				category: "marketing",
				unsubscribeUrl,
				preferencesUrl,
			});

			expect(html).toContain(`href="${unsubscribeUrl}"`);
			expect(html).toContain(">Unsubscribe<");
			expect(html).toContain(`href="${preferencesUrl}"`);
			expect(html).toContain(">Manage preferences<");
			expect(text).toContain(`Unsubscribe ${unsubscribeUrl}`);
			expect(text).toContain(`Manage preferences ${preferencesUrl}`);
		});
	}

	it("renders only the unsubscribe control when marketing supplies only unsubscribeUrl", async () => {
		const { html } = await renderEmail({
			name: "notification",
			to: "ops@example.com",
			category: "marketing",
			unsubscribeUrl,
			data: { title: "Product update", body: "New features shipped this week.", severity: "info" },
		});

		expect(html).toContain(`href="${unsubscribeUrl}"`);
		expect(html).toContain(">Unsubscribe<");
		expect(html).not.toContain("Manage preferences");
	});

	it("rejects marketing when only preferencesUrl is supplied", async () => {
		await expect(
			renderEmail({
				name: "notification",
				to: "ops@example.com",
				category: "marketing",
				preferencesUrl,
				data: {
					title: "Product update",
					body: "New features shipped this week.",
					severity: "info",
				},
			}),
		).rejects.toMatchObject({ name: "EmailValidationError" });
	});

	it("renders distinct unsubscribe and preference controls when marketing supplies both", async () => {
		const { html } = await renderEmail({
			name: "notification",
			to: "ops@example.com",
			category: "marketing",
			unsubscribeUrl,
			preferencesUrl,
			data: { title: "Product update", body: "New features shipped this week.", severity: "info" },
		});

		expect(html).toContain(`href="${unsubscribeUrl}"`);
		expect(html).toContain(">Unsubscribe<");
		expect(html).toContain(`href="${preferencesUrl}"`);
		expect(html).toContain(">Manage preferences<");
		expect(html).toContain(`href="${unsubscribeUrl}" class="resq-email-muted"`);
		expect(html).toContain(`href="${preferencesUrl}" class="resq-email-muted"`);
	});

	it("omits both controls for a transactional notification even when both URLs are supplied", async () => {
		const { html } = await renderEmail({
			name: "notification",
			to: "ops@example.com",
			category: "transactional",
			unsubscribeUrl,
			preferencesUrl,
			data: {
				title: "Deploy finished",
				body: "Your deployment completed successfully.",
				severity: "success",
			},
		});

		expect(html.toLowerCase()).not.toContain("unsubscribe");
		expect(html).not.toContain("Manage preferences");
		expect(html).not.toContain(unsubscribeUrl);
		expect(html).not.toContain(preferencesUrl);
	});

	it("rejects marketing when unsubscribeUrl is missing instead of substituting the homepage", async () => {
		await expect(
			renderEmail({
				name: "notification",
				to: "ops@example.com",
				category: "marketing",
				data: {
					title: "Product update",
					body: "New features shipped this week.",
					severity: "info",
				},
			}),
		).rejects.toMatchObject({ name: "EmailValidationError" });
	});
});
