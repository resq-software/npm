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
import { renderEmail } from "../src/render";

describe("renderEmail", () => {
	it("renders an OTP email with the code in both html and text", async () => {
		const { to, subject, html, text } = await renderEmail({
			name: "otp",
			to: "user@example.com",
			data: { code: "123456", firstName: "Ada" },
		});

		expect(to).toBe("user@example.com");
		expect(subject).toBe("Your ResQ Systems verification code: 123456");
		expect(html).toContain("123456");
		expect(html).toContain("Ada");
		expect(text).toContain("123456");
		expect(text.trim().length).toBeGreaterThan(0);
	});

	it("renders a notification with a call-to-action link", async () => {
		const { html } = await renderEmail({
			name: "notification",
			to: "ops@example.com",
			data: {
				title: "Deploy finished",
				body: "Your deployment completed successfully.",
				severity: "success",
				actionUrl: "https://app.resq.example/deploys/1",
				actionLabel: "View deploy",
			},
		});

		expect(html).toContain("Deploy finished");
		expect(html).toContain("https://app.resq.example/deploys/1");
	});

	it("validates before rendering and rejects a bad payload", async () => {
		await expect(renderEmail({ name: "otp", to: "x@y.com", data: {} })).rejects.toThrow();
	});

	it("renders an incident-alert with the incident id and dashboard link", async () => {
		const { subject, html } = await renderEmail({
			name: "incident-alert",
			to: "oncall@example.com",
			data: {
				incidentId: "INC-2048",
				title: "Wildfire perimeter breach",
				severity: "critical",
				summary: "Fire crossed the northern containment line.",
				dashboardUrl: "https://app.resq.software/incidents/INC-2048",
			},
		});

		expect(subject).toBe("[CRITICAL] Wildfire perimeter breach");
		expect(html).toContain("INC-2048");
		expect(html).toContain("https://app.resq.software/incidents/INC-2048");
	});

	it("applies a theme override to the rendered html", async () => {
		const { html } = await renderEmail(
			{
				name: "welcome",
				to: "u@example.com",
				data: { firstName: "Ada", verifyUrl: "https://x.io/v" },
			},
			{ theme: { colors: { primary: "#0000ff" } } },
		);

		const hasOverride = /#0000ff/i.test(html) || /rgb\(\s*0\s*,\s*0\s*,\s*255/.test(html);
		expect(hasOverride).toBe(true);
	});
});
