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
import { defaultEmailTheme } from "../src/emails/theme";
import { renderEmail } from "../src/render";

type Node = DefaultTreeAdapterTypes.Node;
type Element = DefaultTreeAdapterTypes.Element;
type CopySource = "subject" | "preheader" | "html-text" | "html-alt" | "html-title" | "text";

interface VisibleCopyFixture {
	readonly payload: EmailPayload;
	readonly expectedPreheader: string;
}

interface VisibleBrandViolation {
	readonly source: CopySource;
	readonly value: string;
}

const forbiddenStandaloneBrand = /\bResQ\b(?!\s+(?:Systems|Tactical\s+OS)\b)/g;
const productName = "ResQ Tactical OS";

type EmailName = EmailPayload["name"];
type FixtureByName = {
	readonly [Name in EmailName]: {
		readonly payload: Extract<EmailPayload, { readonly name: Name }>;
		readonly expectedPreheader: string;
	};
};

const fixtureByName = {
	otp: {
		payload: {
			name: "otp",
			to: "user@example.com",
			data: { code: "123456", firstName: "Ada", expiresInMinutes: 10 },
		},
		expectedPreheader: "Your ResQ Systems verification code",
	},
	welcome: {
		payload: {
			name: "welcome",
			to: "user@example.com",
			data: {
				firstName: "Ada",
				verifyUrl: "https://app.resq.software/verify?token=branding",
			},
		},
		expectedPreheader: "Welcome to ResQ Systems, Ada",
	},
	"password-reset": {
		payload: {
			name: "password-reset",
			to: "user@example.com",
			data: {
				firstName: "Ada",
				resetUrl: "https://app.resq.software/reset?token=branding",
				expiresInMinutes: 30,
			},
		},
		expectedPreheader: "Reset your password",
	},
	notification: {
		payload: {
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
		expectedPreheader: "Deploy finished",
	},
	"incident-alert": {
		payload: {
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
		expectedPreheader: "[CRITICAL] Wildfire perimeter breach",
	},
	"password-changed": {
		payload: {
			name: "password-changed",
			to: "user@example.com",
			data: {
				firstName: "Ada",
				changedAt: "2026-07-10 09:14 PT",
				secureAccountUrl: "https://app.resq.software/security",
			},
		},
		expectedPreheader: "Your ResQ Systems password was changed",
	},
	"new-device-login": {
		payload: {
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
		expectedPreheader: "New sign-in to your ResQ Systems account",
	},
	"mission-approval": {
		payload: {
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
		expectedPreheader: "Mission approval needed: Deploy swarm to Sector 7 wildfire",
	},
	"org-invitation": {
		payload: {
			name: "org-invitation",
			to: "invitee@example.com",
			data: {
				orgName: "Cascade County SAR",
				inviterName: "Dana Ruiz",
				orgRole: "Operator",
				acceptUrl: "https://app.resq.software/invitations/accept?token=branding",
				expiresInDays: 7,
			},
		},
		expectedPreheader: "You're invited to join Cascade County SAR on ResQ Systems",
	},
} satisfies FixtureByName;

const fixtures: readonly VisibleCopyFixture[] = Object.values(fixtureByName);

function isElement(node: Node): node is Element {
	return "tagName" in node;
}

function attribute(element: Element, name: string): string | undefined {
	return element.attrs.find((candidate) => candidate.name === name)?.value;
}

function hasClass(element: Element, className: string): boolean {
	return (attribute(element, "class") ?? "").split(/\s+/u).includes(className);
}

function elements(node: Node): Element[] {
	const children = "childNodes" in node ? node.childNodes : [];
	return children.flatMap((child) => [...(isElement(child) ? [child] : []), ...elements(child)]);
}

function byClass(root: Node, className: string): Element[] {
	return elements(root).filter((element) => hasClass(element, className));
}

const blockElements = new Set([
	"address",
	"article",
	"aside",
	"blockquote",
	"br",
	"caption",
	"dd",
	"div",
	"dl",
	"dt",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hr",
	"li",
	"main",
	"nav",
	"ol",
	"p",
	"pre",
	"section",
	"table",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"tr",
	"ul",
]);
const blockBoundary = "\u0000";

function excludesElement(
	element: Element,
	excludedClasses: ReadonlySet<string>,
	skipPreheader: boolean,
): boolean {
	return (
		["head", "script", "style"].includes(element.tagName) ||
		(skipPreheader && attribute(element, "data-skip-in-text") === "true") ||
		[...excludedClasses].some((className) => hasClass(element, className))
	);
}

function semanticText(
	node: Node,
	excludedClasses: ReadonlySet<string>,
	skipPreheader = true,
): string {
	if (isElement(node) && excludesElement(node, excludedClasses, skipPreheader)) return "";
	if (node.nodeName === "#text") return node.value;
	if (!("childNodes" in node)) return "";

	return node.childNodes
		.map((child) => {
			const value = semanticText(child, excludedClasses, skipPreheader);
			return isElement(child) && blockElements.has(child.tagName)
				? `${blockBoundary}${value}${blockBoundary}`
				: value;
		})
		.join("");
}

function visibleAttributes(
	node: Node,
	excludedClasses: ReadonlySet<string>,
): ReadonlyArray<{ source: "html-alt" | "html-title"; value: string }> {
	if (isElement(node)) {
		if (excludesElement(node, excludedClasses, true)) return [];
		const attributes = (["alt", "title"] as const).flatMap((name) => {
			const value = attribute(node, name);
			return value ? [{ source: `html-${name}` as const, value }] : [];
		});
		return [
			...attributes,
			...node.childNodes.flatMap((child) => visibleAttributes(child, excludedClasses)),
		];
	}
	if (!("childNodes" in node)) return [];
	return node.childNodes.flatMap((child) => visibleAttributes(child, excludedClasses));
}

function visibleHtmlCopy(
	node: Node,
	excludedClasses: ReadonlySet<string> = new Set(),
): ReadonlyArray<{ source: "html-text" | "html-alt" | "html-title"; value: string }> {
	const text = semanticText(node, excludedClasses)
		.split(blockBoundary)
		.map((value) => value.replace(/\s+/gu, " ").trim())
		.filter(Boolean)
		.map((value) => ({ source: "html-text" as const, value }));
	return [...text, ...visibleAttributes(node, excludedClasses)];
}

function renderedPreheader(document: Node): string {
	const previewElements = elements(document).filter(
		(element) => attribute(element, "data-skip-in-text") === "true",
	);
	if (previewElements.length !== 1) {
		throw new Error(`expected one rendered Preview element, received ${previewElements.length}`);
	}

	return previewElements[0]!.childNodes
		.map((child) => (child.nodeName === "#text" ? child.value : ""))
		.join("")
		.replace(/\s+/gu, " ")
		.trim();
}

function findForbiddenBranding({
	subject,
	html,
	text,
}: {
	readonly subject: string;
	readonly html: string;
	readonly text: string;
}): VisibleBrandViolation[] {
	const document = parse(html);
	const copy: ReadonlyArray<{ source: CopySource; value: string }> = [
		{ source: "subject", value: subject },
		{ source: "preheader", value: renderedPreheader(document) },
		...visibleHtmlCopy(document),
		{ source: "text", value: text },
	];

	return copy.flatMap(({ source, value }) =>
		[...value.matchAll(forbiddenStandaloneBrand)].map(() => ({ source, value })),
	);
}

function normalizedVisibleCopy(
	node: Node,
	excludedClasses: ReadonlySet<string> = new Set(),
): string {
	return visibleHtmlCopy(node, excludedClasses)
		.map(({ value }) => value)
		.join(" ")
		.replace(/\s+/gu, " ")
		.trim();
}

describe("visible brand scanner controls", () => {
	const htmlWithPreview = (body: string, preview = "Approved preheader") =>
		`<div data-skip-in-text="true">${preview}</div>${body}`;
	const safe = {
		subject: "Approved company message",
		html: htmlWithPreview("<p>Approved body</p>"),
		text: "Approved plain text",
	};

	it.each([
		["HTML text node", { ...safe, html: htmlWithPreview("<p>Visit ResQ today</p>") }, "html-text"],
		[
			"image alt text",
			{ ...safe, html: htmlWithPreview('<img alt="ResQ alert" src="hero.png">') },
			"html-alt",
		],
		[
			"image title text",
			{ ...safe, html: htmlWithPreview('<img title="ResQ alert" src="hero.png">') },
			"html-title",
		],
		["subject", { ...safe, subject: "Your ResQ alert" }, "subject"],
		[
			"preheader",
			{ ...safe, html: htmlWithPreview("<p>Approved body</p>", "Your ResQ alert") },
			"preheader",
		],
		["plain text", { ...safe, text: "Your ResQ alert" }, "text"],
	] as const)("detects standalone ResQ in %s", (_label, input, source) => {
		expect(findForbiddenBranding(input)).toEqual([
			{ source, value: expect.stringContaining("ResQ") },
		]);
	});

	it.each([
		["company name", "ResQ Systems"],
		["product name", "ResQ Tactical OS"],
		["lowercase website URL", "https://resq.software"],
	] as const)("accepts the approved %s", (_label, value) => {
		expect(
			findForbiddenBranding({
				subject: value,
				html: htmlWithPreview(`<p>${value}</p>`, value),
				text: value,
			}),
		).toEqual([]);
	});

	it("accepts an approved company name split across inline elements", () => {
		expect(
			findForbiddenBranding({
				...safe,
				html: htmlWithPreview("<p>ResQ <strong>Systems</strong></p>"),
			}),
		).toEqual([]);
	});

	it("detects a forbidden brand token split across inline elements", () => {
		expect(
			findForbiddenBranding({
				...safe,
				html: htmlWithPreview("<p>Res<strong>Q</strong></p>"),
			}),
		).toEqual([{ source: "html-text", value: "ResQ" }]);
	});

	it("does not join an approved phrase across separate visible blocks", () => {
		expect(
			findForbiddenBranding({
				...safe,
				html: htmlWithPreview("<p>ResQ</p><p>Systems</p>"),
			}),
		).toEqual([{ source: "html-text", value: "ResQ" }]);
	});

	it("ignores class and source identifiers containing resq", () => {
		expect(
			findForbiddenBranding({
				...safe,
				html: htmlWithPreview(
					'<img class="ResQ resq-email-logo" src="https://cdn.example.com/ResQ-logo.png" alt="Approved company mark">',
				),
			}),
		).toEqual([]);
	});

	it("detects standalone branding in the rendered Preview element", async () => {
		const fixture = fixtures[0]!;
		const rendered = await renderEmail(fixture.payload);
		const html = rendered.html.replace(fixture.expectedPreheader, "Your ResQ alert");

		expect(html).not.toBe(rendered.html);
		expect(
			findForbiddenBranding({
				subject: rendered.subject,
				html,
				text: rendered.text,
			}),
		).toEqual([{ source: "preheader", value: expect.stringContaining("ResQ") }]);
	});
});

describe("built-in visible identity matrix", () => {
	const { org } = defaultEmailTheme;
	const productTemplates = new Set<EmailPayload["name"]>(["incident-alert", "mission-approval"]);

	for (const fixture of fixtures) {
		it(`renders approved visible identity for ${fixture.payload.name}`, async () => {
			const rendered = await renderEmail(fixture.payload);
			const document = parse(rendered.html);
			const card = byClass(document, "resq-email-card");
			const header = byClass(document, "resq-email-header");
			const preheader = renderedPreheader(document);

			expect(preheader).toBe(fixture.expectedPreheader);

			expect(
				findForbiddenBranding({
					subject: rendered.subject,
					html: rendered.html,
					text: rendered.text,
				}),
			).toEqual([]);

			expect(rendered.html).toContain(org.legalName);
			expect(rendered.html).toContain(org.registeredAddress);
			expect(rendered.text).toContain(org.legalName);
			expect(rendered.text).toContain(org.registeredAddress);
			expect(rendered.html).toContain(`href="${org.termsUrl}"`);
			expect(rendered.html).toContain(">Terms<");
			expect(rendered.html).toContain(`href="${org.privacyUrl}"`);
			expect(rendered.html).toContain(">Privacy<");
			expect(rendered.text).toContain(`Terms ${org.termsUrl}`);
			expect(rendered.text).toContain(`Privacy ${org.privacyUrl}`);

			expect(card).toHaveLength(1);
			expect(header).toHaveLength(1);
			expect(normalizedVisibleCopy(header[0]!)).toBe(
				`${org.brandName} ${org.descriptor.toUpperCase()}`,
			);
			expect(normalizedVisibleCopy(header[0]!)).not.toContain(productName);

			const bodyCopy = normalizedVisibleCopy(
				card[0]!,
				new Set(["resq-email-header", "resq-email-footer"]),
			);
			const productOccurrences = bodyCopy.match(/\bResQ Tactical OS\b/g)?.length ?? 0;
			if (productTemplates.has(fixture.payload.name)) {
				expect(productOccurrences).toBeGreaterThanOrEqual(1);
			} else {
				expect(productOccurrences).toBe(0);
			}
		});
	}
});
