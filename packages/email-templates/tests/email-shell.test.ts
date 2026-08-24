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

import { parse, type DefaultTreeAdapterTypes } from "parse5";
import { describe, expect, it } from "vitest";
import type { EmailPayload } from "../src/contract";
import { emailDesignContract } from "../src/email-design-contract";
import { renderEmail } from "../src/render";

type Node = DefaultTreeAdapterTypes.Node;
type Element = DefaultTreeAdapterTypes.Element;

const fixtures: readonly EmailPayload[] = [
	{
		name: "otp",
		to: "user@example.com",
		data: { code: "123456", firstName: "Ada", expiresInMinutes: 10 },
	},
	{
		name: "welcome",
		to: "user@example.com",
		data: { firstName: "Ada", verifyUrl: "https://app.resq.software/verify?token=shell" },
	},
	{
		name: "password-reset",
		to: "user@example.com",
		data: {
			firstName: "Ada",
			resetUrl: "https://app.resq.software/reset?token=shell",
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
	{
		name: "password-changed",
		to: "user@example.com",
		data: {
			firstName: "Ada",
			changedAt: "2026-07-10 09:14 PT",
			secureAccountUrl: "https://app.resq.software/security",
		},
	},
	{
		name: "new-device-login",
		to: "user@example.com",
		data: {
			firstName: "Ada",
			device: "Chrome on macOS",
			location: "Newark, DE, USA",
			ipAddress: "203.0.113.24",
			at: "2026-07-10 09:14 PT",
			secureAccountUrl: "https://app.resq.software/security",
		},
	},
	{
		name: "mission-approval",
		to: "approver@example.com",
		data: {
			missionId: "MSN-4821",
			title: "Deploy swarm to Sector 7 wildfire",
			summary: "Reroute 12 drones for thermal mapping along the northern ridge.",
			requestedBy: "Field Commander Vega",
			severity: "critical",
			approveUrl: "https://app.example.com/missions/MSN-4821/approve",
			expiresInMinutes: 15,
		},
	},
	{
		name: "org-invitation",
		to: "invitee@example.com",
		data: {
			orgName: "Cascade County SAR",
			inviterName: "Dana Ruiz",
			orgRole: "Operator",
			acceptUrl: "https://app.resq.software/invitations/accept?token=shell",
			expiresInDays: 7,
		},
	},
];

const ctaHrefByName: Readonly<Partial<Record<EmailPayload["name"], string>>> = {
	welcome: "https://app.resq.software/verify?token=shell",
	"password-reset": "https://app.resq.software/reset?token=shell",
	notification: "https://app.resq.software/deploys/1",
	"incident-alert": "https://app.resq.software/incidents/INC-2048",
	"password-changed": "https://app.resq.software/security",
	"new-device-login": "https://app.resq.software/security",
	"mission-approval": "https://app.example.com/missions/MSN-4821/approve",
	"org-invitation": "https://app.resq.software/invitations/accept?token=shell",
};

const mutedMetadataByName: Readonly<Partial<Record<EmailPayload["name"], string>>> = {
	"incident-alert": "Incident INC-2048",
	"new-device-login": "Chrome on macOS",
	"mission-approval": "Mission MSN-4821",
};

function isElement(node: Node): node is Element {
	return "tagName" in node;
}

function descendants(node: Node): Node[] {
	const children = "childNodes" in node ? node.childNodes : [];
	return children.flatMap((child) => [child, ...descendants(child)]);
}

function elements(node: Node): Element[] {
	return descendants(node).filter(isElement);
}

function attribute(element: Element, name: string): string | undefined {
	return element.attrs.find((candidate) => candidate.name === name)?.value;
}

function hasClass(element: Element, className: string): boolean {
	return (attribute(element, "class") ?? "").split(/\s+/u).includes(className);
}

function byClass(root: Node, className: string): Element[] {
	return elements(root).filter((element) => hasClass(element, className));
}

function textContent(node: Node): string {
	if (node.nodeName === "#text") return node.value;
	if (!("childNodes" in node)) return "";
	return node.childNodes.map(textContent).join("");
}

function normalizedText(node: Node): string {
	return textContent(node).replace(/\s+/gu, " ").trim();
}

function styleOf(element: Element): string {
	return attribute(element, "style") ?? "";
}

function expectStyle(element: Element, declaration: string): void {
	expect(styleOf(element)).toContain(declaration);
}

function expectDarkRule(
	styleText: string,
	selector: string,
	declarations: readonly string[],
): void {
	const start = styleText.indexOf(`${selector} {`);
	expect(start).toBeGreaterThanOrEqual(0);
	const end = styleText.indexOf("}", start);
	expect(end).toBeGreaterThan(start);
	const rule = styleText.slice(start, end);
	for (const declaration of declarations) {
		expect(rule).toContain(declaration);
	}
}

function hexToRgb(hex: `#${string}`): string {
	const [red, green, blue] = [1, 3, 5].map((offset) =>
		Number.parseInt(hex.slice(offset, offset + 2), 16),
	);
	return `rgb(${red},${green},${blue})`;
}

describe("shared email shell", () => {
	for (const fixture of fixtures) {
		it(`renders the adaptive company-first shell for ${fixture.name}`, async () => {
			const { html } = await renderEmail(fixture);
			const document = parse(html);
			const allElements = elements(document);
			const meta = (name: string) =>
				allElements.find(
					(element) => element.tagName === "meta" && attribute(element, "name") === name,
				);

			expect(attribute(meta("color-scheme")!, "content")).toBe("light dark");
			expect(attribute(meta("supported-color-schemes")!, "content")).toBe("light dark");

			const body = byClass(document, "resq-email-body");
			const canvas = byClass(document, "resq-email-canvas");
			const card = byClass(document, "resq-email-card");
			const header = byClass(document, "resq-email-header");
			const footer = byClass(document, "resq-email-footer");
			expect(body).toHaveLength(1);
			expect(canvas).toHaveLength(1);
			expect(canvas[0]!.tagName).toBe("td");
			expect(card).toHaveLength(1);
			expect(header).toHaveLength(1);
			expect(footer).toHaveLength(1);

			expectStyle(
				body[0]!,
				`background-color:${hexToRgb(emailDesignContract.modes.light.background)}`,
			);
			expectStyle(
				canvas[0]!,
				`background-color:${hexToRgb(emailDesignContract.modes.light.background)}`,
			);
			expectStyle(canvas[0]!, `color:${hexToRgb(emailDesignContract.modes.light.foreground)}`);
			expectStyle(
				card[0]!,
				`background-color:${hexToRgb(emailDesignContract.modes.light.surface)}`,
			);
			expectStyle(card[0]!, `border-color:${hexToRgb(emailDesignContract.modes.light.border)}`);
			expectStyle(card[0]!, `max-width:${emailDesignContract.layout.cardWidthPx}px`);
			expectStyle(card[0]!, `padding:${emailDesignContract.layout.desktopPaddingPx}px`);
			expectStyle(card[0]!, `border-radius:${emailDesignContract.layout.radiusPx}px`);
			const foregroundRoles = byClass(card[0]!, "resq-email-foreground");
			const mutedRoles = byClass(card[0]!, "resq-email-muted");
			const neutralDivider = byClass(card[0]!, "resq-email-neutral-divider");
			const brandRule = byClass(header[0]!, "resq-email-brand-rule");
			expect(foregroundRoles.length).toBeGreaterThan(0);
			expect(mutedRoles.length).toBeGreaterThan(0);
			expect(neutralDivider).toHaveLength(1);
			expect(brandRule).toHaveLength(1);
			expect(
				foregroundRoles.some((element) =>
					styleOf(element).includes(
						`color:${hexToRgb(emailDesignContract.modes.light.foreground)}`,
					),
				),
			).toBe(true);
			expect(
				mutedRoles.some((element) =>
					styleOf(element).includes(`color:${hexToRgb(emailDesignContract.modes.light.muted)}`),
				),
			).toBe(true);
			expectStyle(
				neutralDivider[0]!,
				`border-color:${hexToRgb(emailDesignContract.modes.light.border)}`,
			);
			expectStyle(
				brandRule[0]!,
				`background-color:${hexToRgb(emailDesignContract.modes.light.primary)}`,
			);

			const headerElements = elements(header[0]!);
			const headerBrand = headerElements.find(
				(element) => normalizedText(element) === "ResQ Systems",
			);
			const headerDescriptor = headerElements.find(
				(element) => normalizedText(element) === "AUTONOMOUS DISASTER RESPONSE",
			);
			expect(headerBrand).toBeDefined();
			expect(headerDescriptor).toBeDefined();
			expect(headerElements.indexOf(headerBrand!)).toBeLessThan(
				headerElements.indexOf(headerDescriptor!),
			);
			expect(headerElements.filter((element) => element.tagName === "img")).toHaveLength(0);

			const styleText = allElements
				.filter((element) => element.tagName === "style")
				.map(textContent)
				.join("\n");
			expect(styleText).toContain("@media (prefers-color-scheme: dark)");
			for (const color of Object.values(emailDesignContract.modes.dark)) {
				expect(styleText).toContain(color);
			}
			expectDarkRule(styleText, ".resq-email-canvas", [
				`background-color: ${emailDesignContract.modes.dark.background} !important`,
				`color: ${emailDesignContract.modes.dark.foreground} !important`,
			]);

			const otpPanels = byClass(card[0]!, "resq-email-otp-panel");
			if (fixture.name === "otp") {
				expect(otpPanels).toHaveLength(1);
				expectStyle(
					otpPanels[0]!,
					`background-color:${hexToRgb(emailDesignContract.modes.light.background)}`,
				);
				expectStyle(
					otpPanels[0]!,
					`border-color:${hexToRgb(emailDesignContract.modes.light.border)}`,
				);
				expectDarkRule(styleText, ".resq-email-otp-panel", [
					`background-color: ${emailDesignContract.modes.dark.background} !important`,
					`border-color: ${emailDesignContract.modes.dark.border} !important`,
				]);
			} else {
				expect(otpPanels).toHaveLength(0);
			}

			const metadataText = mutedMetadataByName[fixture.name];
			if (metadataText) {
				const metadata = allElements.find(
					(element) => element.tagName === "p" && normalizedText(element).includes(metadataText),
				);
				expect(metadata).toBeDefined();
				expect(hasClass(metadata!, "resq-email-muted")).toBe(true);
				expectStyle(metadata!, `color:${hexToRgb(emailDesignContract.modes.light.muted)}`);
			}

			const bodyFontStyle = styleOf(
				allElements.find((element) => styleOf(element).includes("DM Sans"))!,
			);
			const displayFontStyle = styleOf(headerBrand!);
			expect(displayFontStyle.indexOf("Syne")).toBeLessThan(
				displayFontStyle.indexOf("Helvetica Neue"),
			);
			expect(displayFontStyle.indexOf("Helvetica Neue")).toBeLessThan(
				displayFontStyle.indexOf("Arial"),
			);
			expect(bodyFontStyle.indexOf("DM Sans")).toBeLessThan(bodyFontStyle.indexOf("-apple-system"));

			const signOff = "— The ResQ Systems team";
			expect(normalizedText(card[0]!).split(signOff)).toHaveLength(2);
			const cardElements = elements(card[0]!);
			const title = cardElements.find((element) => element.tagName === "h1");
			const signOffElement = cardElements.find((element) => normalizedText(element) === signOff);
			const divider = byClass(footer[0]!, "resq-email-neutral-divider")[0];
			expect(cardElements.indexOf(title!)).toBeLessThan(cardElements.indexOf(signOffElement!));
			expect(cardElements.indexOf(signOffElement!)).toBeLessThan(cardElements.indexOf(divider!));
			const footerElements = elements(footer[0]!);
			const dividerIndex = footerElements.indexOf(divider!);
			const legalCopy = footerElements.filter(
				(element, index) => element.tagName === "p" && index > dividerIndex,
			);
			expect(legalCopy.length).toBeGreaterThanOrEqual(3);
			for (const legalLine of legalCopy) {
				expectStyle(
					legalLine,
					`line-height:${emailDesignContract.presentation.footer.lineHeightPx}px`,
				);
			}
			for (const href of [
				emailDesignContract.identity.termsUrl,
				emailDesignContract.identity.privacyUrl,
			]) {
				const legalLink = footerElements.find(
					(element) => element.tagName === "a" && attribute(element, "href") === href,
				);
				expect(legalLink).toBeDefined();
				expect(hasClass(legalLink!, "resq-email-muted")).toBe(true);
				expectStyle(legalLink!, `color:${hexToRgb(emailDesignContract.modes.light.muted)}`);
			}

			const ctaTables = byClass(card[0]!, "resq-email-primary-cta");
			if (fixture.name === "otp") {
				expect(ctaTables).toHaveLength(0);
			} else {
				const expectedHref = ctaHrefByName[fixture.name];
				expect(expectedHref).toBeDefined();
				expect(ctaTables).toHaveLength(1);
				expect(ctaTables[0]!.tagName).toBe("table");
				expect(attribute(ctaTables[0]!, "width")).toBe("100%");
				expectStyle(ctaTables[0]!, "width:100%");
				expect(emailDesignContract.presentation.cta.minimumHeightPx).toBe(44);
				const expectedHeight = String(emailDesignContract.presentation.cta.minimumHeightPx);
				const presentationCells = elements(ctaTables[0]!).filter(
					(element) => element.tagName === "td" && attribute(element, "height") === expectedHeight,
				);
				expect(presentationCells).toHaveLength(1);
				expect(attribute(presentationCells[0]!, "height")).toBe("44");
				expectStyle(
					presentationCells[0]!,
					`border-radius:${emailDesignContract.presentation.cta.radiusPx}px`,
				);
				expect(elements(presentationCells[0]!).some((element) => element.tagName === "a")).toBe(
					true,
				);
				expect(cardElements.indexOf(ctaTables[0]!)).toBeLessThan(
					cardElements.indexOf(signOffElement!),
				);
				expect(normalizedText(ctaTables[0]!)).toContain(expectedHref);
				expect(
					elements(ctaTables[0]!).filter(
						(element) => element.tagName === "a" && attribute(element, "href") === expectedHref,
					),
				).toHaveLength(2);
			}

			expect(html).not.toMatch(/<v:|xmlns:v=|<!--[[]if\s+(?:mso|gte\s+mso)/iu);
		});
	}

	it("keeps every marketing legal link reachable by the dark muted role", async () => {
		const unsubscribeUrl = "https://resq.software/unsubscribe?shell=dark";
		const { html } = await renderEmail({
			name: "notification",
			to: "ops@example.com",
			category: "marketing",
			unsubscribeUrl,
			data: { title: "Operational update", body: "Details", severity: "info" },
		});
		const document = parse(html);
		const footer = byClass(document, "resq-email-footer")[0];
		expect(footer).toBeDefined();

		for (const href of [
			emailDesignContract.identity.termsUrl,
			emailDesignContract.identity.privacyUrl,
			unsubscribeUrl,
		]) {
			const link = elements(footer!).find(
				(element) => element.tagName === "a" && attribute(element, "href") === href,
			);
			expect(link).toBeDefined();
			expect(hasClass(link!, "resq-email-muted")).toBe(true);
			expectStyle(link!, `color:${hexToRgb(emailDesignContract.modes.light.muted)}`);
		}
	});
});
