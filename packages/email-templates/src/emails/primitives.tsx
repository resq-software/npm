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

import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { type ReactNode, useContext } from "react";
import type { EmailCategory } from "../schemas.js";
import {
	EmailMessageContext,
	EmailThemeContext,
	type EmailThemeOverride,
	buildTailwindConfig,
	resolveEmailTheme,
} from "./theme.js";

interface ShellProps {
	preview: string;
	/** Per-render brand override, merged over the active theme (context or default). */
	theme?: EmailThemeOverride;
	children: ReactNode;
}

/** Outer document, resolved theme, preview text, and a single bordered card. */
function Shell({ preview, theme, children }: ShellProps) {
	const resolved = resolveEmailTheme(useContext(EmailThemeContext), theme);
	const config = buildTailwindConfig(resolved);

	return (
		<Html lang="en">
			<Head>
				<meta name="color-scheme" content="dark" />
				<meta name="supported-color-schemes" content="dark" />
				{resolved.fontsHref ? <link href={resolved.fontsHref} rel="stylesheet" /> : null}
			</Head>
			<Tailwind config={config}>
				<Preview>{preview}</Preview>
				<Body className="bg-background font-sans text-foreground">
					<Container className="mx-auto my-10 max-w-xl rounded-xl border border-solid border-border bg-surface p-10">
						{children}
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

/** Brand lockup (logo + product wordmark) rendered at the top of the card. */
function Header() {
	const { org } = useContext(EmailThemeContext);
	return (
		<Section className="mb-8">
			<Img
				src={org.logoUrl}
				width="40"
				height="40"
				alt={org.productName}
				className="inline-block align-middle"
			/>
			<Text className="ml-3 inline-block align-middle font-display text-lg font-bold tracking-tight text-foreground">
				{org.productName}
			</Text>
		</Section>
	);
}

function Title({ children }: { children: ReactNode }) {
	return (
		<Heading className="mb-4 font-display text-2xl font-bold tracking-tight text-foreground">
			{children}
		</Heading>
	);
}

function Paragraph({ children }: { children: ReactNode }) {
	return (
		<Text className="mb-4 font-sans text-base leading-relaxed text-foreground">{children}</Text>
	);
}

/**
 * Role-based sign-off. Defaults to "— The {brand} team", derived from the active
 * theme's org so a rebrand flows through. Keep copy neutral: no first-person
 * promises or commitments (per the content & legal guide).
 */
function Signature({ children }: { children?: ReactNode }) {
	const { org } = useContext(EmailThemeContext);
	return (
		<Text className="mt-6 font-sans text-sm leading-relaxed text-muted">
			{children ?? `— The ${org.brandName} team`}
		</Text>
	);
}

/**
 * Muted support-contact line for security notices, sourced from
 * `theme.org.supportEmail` so there is always an actionable path even when a
 * template's optional CTA is absent. `children` overrides the lead-in prompt.
 */
function SupportLine({ children }: { children?: ReactNode }) {
	const { org } = useContext(EmailThemeContext);
	return (
		<Text className="mb-4 font-sans text-sm leading-relaxed text-muted">
			{children ?? "Didn't do this?"} Contact us at{" "}
			<Link href={`mailto:${org.supportEmail}`} className="text-primary underline">
				{org.supportEmail}
			</Link>
			.
		</Text>
	);
}

/** A large, letter-spaced code block for OTP / verification codes. */
function Code({ children }: { children: ReactNode }) {
	return (
		<Section className="my-6 rounded-md border border-solid border-border bg-background py-4 text-center">
			<Text className="font-mono text-3xl font-medium tracking-[8px] text-foreground">
				{children}
			</Text>
		</Section>
	);
}

/**
 * Plain-text fallback for a link/button — improves deliverability and works in
 * clients that strip buttons. Renders the raw URL so it stays copy-pasteable.
 */
function FallbackLink({ href }: { href: string }) {
	return (
		<Text className="mt-4 font-sans text-xs leading-relaxed text-muted">
			Or paste this link into your browser:
			<br />
			<Link href={href} className="break-all text-primary">
				{href}
			</Link>
		</Text>
	);
}

/** Primary call-to-action — brand primary, mono, uppercase, tracked (per style guide). */
function CTA({
	href,
	children,
	fallback = true,
}: {
	href: string;
	children: ReactNode;
	/** Render a copy-pasteable {@link FallbackLink} below the button (default `true`). */
	fallback?: boolean;
}) {
	return (
		<Section className="my-6">
			<Button
				href={href}
				className="box-border block rounded-md bg-primary px-8 py-3.5 text-center font-mono text-sm font-medium uppercase tracking-wide text-white no-underline"
			>
				{children}
			</Button>
			{fallback ? <FallbackLink href={href} /> : null}
		</Section>
	);
}

function Footer({ children }: { children: ReactNode }) {
	return (
		<>
			<Hr className="my-6 border-border" />
			<Text className="font-sans text-xs leading-relaxed text-muted">{children}</Text>
		</>
	);
}

/**
 * Compliance footer: legal entity + registered postal address, Terms/Privacy
 * links, and — for `marketing` sends only — an unsubscribe affordance. The
 * effective category is the `category` prop, falling back to the active
 * {@link EmailMessageContext}. All copy is small and muted.
 */
function LegalFooter({ reason, category }: { reason?: ReactNode; category?: EmailCategory }) {
	const { org } = useContext(EmailThemeContext);
	const message = useContext(EmailMessageContext);
	const effectiveCategory = category ?? message.category;
	// CAN-SPAM/GDPR: the homepage is not a valid opt-out, so never fall back to
	// `org.websiteUrl`. Marketing sends without a real `unsubscribeUrl` simply
	// omit the affordance (and are effectively transactional).
	const unsubscribeHref = message.unsubscribeUrl;
	return (
		<>
			<Hr className="my-6 border-border" />
			{reason ? (
				<Text className="mb-2 font-sans text-xs leading-relaxed text-muted">{reason}</Text>
			) : null}
			{/* `registeredAddress` already leads with the legal entity name, so it is a
			    complete CAN-SPAM postal line on its own — no separate `legalName`. */}
			<Text className="mb-2 font-sans text-xs leading-relaxed text-muted">
				{org.registeredAddress}
			</Text>
			<Text className="mb-2 font-sans text-xs leading-relaxed text-muted">
				<Link href={org.termsUrl} className="text-muted underline">
					Terms
				</Link>
				{" · "}
				<Link href={org.privacyUrl} className="text-muted underline">
					Privacy
				</Link>
			</Text>
			{effectiveCategory === "marketing" && unsubscribeHref ? (
				<Text className="font-sans text-xs leading-relaxed text-muted">
					<Link href={unsubscribeHref} className="text-muted underline">
						Unsubscribe or manage preferences
					</Link>
				</Text>
			) : null}
		</>
	);
}

/**
 * Compound email primitives. Templates compose only from these so styling stays
 * consistent, theme-driven, and email-client safe. The raw react-email
 * `Section`, `Text`, `Link`, and `Hr` are re-exported for templates that need
 * finer control.
 */
export const Email: {
	readonly Shell: typeof Shell;
	readonly Header: typeof Header;
	readonly Title: typeof Title;
	readonly Paragraph: typeof Paragraph;
	readonly Signature: typeof Signature;
	readonly SupportLine: typeof SupportLine;
	readonly Code: typeof Code;
	readonly CTA: typeof CTA;
	readonly FallbackLink: typeof FallbackLink;
	readonly Footer: typeof Footer;
	readonly LegalFooter: typeof LegalFooter;
	readonly Section: typeof Section;
	readonly Text: typeof Text;
	readonly Link: typeof Link;
	readonly Hr: typeof Hr;
} = {
	Shell,
	Header,
	Title,
	Paragraph,
	Signature,
	SupportLine,
	Code,
	CTA,
	FallbackLink,
	Footer,
	LegalFooter,
	Section,
	Text,
	Link,
	Hr,
};
