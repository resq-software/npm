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
 * @fileoverview Compound email primitives — theme-driven, client-safe building blocks
 * (shell, header, CTA, legal footer, and more) that every template composes from,
 * exposed as a single `Email` namespace object.
 *
 * @module @resq-systems/email-templates/emails/primitives
 */

import {
	Body,
	Column,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { type ReactNode, useContext } from "react";
import { emailDesignContract } from "../email-design-contract.js";
import {
	EmailMessageContext,
	EmailThemeContext,
	type EmailThemeOverride,
	buildDarkModeCss,
	buildTailwindConfig,
	resolveEmailTheme,
} from "./theme.js";

//#region Internal

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
				<meta name="color-scheme" content="light dark" />
				<meta name="supported-color-schemes" content="light dark" />
				{resolved.fontsHref ? <link href={resolved.fontsHref} rel="stylesheet" /> : null}
				<style>{`${buildDarkModeCss(resolved)}
@media only screen and (max-width: ${emailDesignContract.layout.cardWidthPx + emailDesignContract.layout.mobilePaddingPx * 2}px) {
  .resq-email-card { padding: ${emailDesignContract.layout.mobilePaddingPx}px !important; }
}`}</style>
			</Head>
			<Tailwind config={config}>
				<Preview>{preview}</Preview>
				<Body className="resq-email-body resq-email-foreground bg-background font-sans text-foreground">
					<Row>
						<Column className="resq-email-canvas bg-background text-foreground">
							<Container
								className="resq-email-card mx-auto my-10 border border-solid border-border bg-surface"
								style={{
									borderRadius: `${emailDesignContract.layout.radiusPx}px`,
									maxWidth: `${emailDesignContract.layout.cardWidthPx}px`,
									padding: `${emailDesignContract.layout.desktopPaddingPx}px`,
								}}
							>
								{children}
							</Container>
						</Column>
					</Row>
				</Body>
			</Tailwind>
		</Html>
	);
}

/** Company lockup rendered at the top of the card. */
function Header() {
	const { org } = useContext(EmailThemeContext);
	const { logoSizePx, logoGapPx, brandRulePx } = emailDesignContract.presentation.header;
	return (
		<Section className="resq-email-header mb-8">
			<Row className="resq-email-logo-row" role="presentation" align="left">
				<Column
					className="resq-email-logo-cell"
					width={String(logoSizePx)}
					style={{ width: `${logoSizePx}px`, verticalAlign: "middle" }}
				>
					<Img
						className="resq-email-logo"
						src={emailDesignContract.identity.logoUrl}
						alt=""
						width={logoSizePx}
						height={logoSizePx}
						style={{ border: 0, display: "block" }}
					/>
				</Column>
				<Column
					className="resq-email-logo-spacer"
					data-skip-in-text="true"
					width={String(logoGapPx)}
					style={{ fontSize: 0, lineHeight: "0", width: `${logoGapPx}px` }}
				>
					{"\u00a0"}
				</Column>
				<Column className="resq-email-identity" style={{ verticalAlign: "middle" }}>
					<Text className="resq-email-foreground m-0 font-display text-xl font-bold tracking-tight text-foreground">
						{org.brandName}
					</Text>{" "}
					<Text className="resq-email-muted mb-0 mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
						{org.descriptor.toUpperCase()}
					</Text>
				</Column>
			</Row>
			<Hr
				className="resq-email-brand-rule mb-0 mt-4 border-0 bg-primary"
				style={{ height: `${brandRulePx}px` }}
			/>
		</Section>
	);
}

function Title({ children }: { children: ReactNode }) {
	return (
		<Heading className="resq-email-foreground mb-4 font-display text-2xl font-bold tracking-tight text-foreground">
			{children}
		</Heading>
	);
}

function Paragraph({ children }: { children: ReactNode }) {
	return (
		<Text className="resq-email-foreground mb-4 font-sans text-[15px] leading-[1.6] text-foreground">
			{children}
		</Text>
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
		<Text className="resq-email-muted mt-6 font-sans text-sm leading-relaxed text-muted">
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
		<Text className="resq-email-muted mb-4 font-sans text-sm leading-relaxed text-muted">
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
		<Section className="resq-email-otp-panel my-6 rounded-md border border-solid border-border bg-background py-4 text-center">
			<Text className="resq-email-foreground font-mono text-3xl font-medium tracking-[8px] text-foreground">
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
		<Text className="resq-email-muted mt-4 font-sans text-xs leading-relaxed text-muted">
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
		<Section className="resq-email-primary-cta my-6 w-full" width="100%" style={{ width: "100%" }}>
			<Row>
				<Column
					align="center"
					height={String(emailDesignContract.presentation.cta.minimumHeightPx)}
					className="bg-primary text-center"
					style={{
						borderRadius: `${emailDesignContract.presentation.cta.radiusPx}px`,
						height: `${emailDesignContract.presentation.cta.minimumHeightPx}px`,
					}}
				>
					<Link
						href={href}
						className="box-border block w-full px-6 text-center font-mono text-sm font-medium uppercase tracking-wide text-white no-underline"
						style={{ lineHeight: `${emailDesignContract.presentation.cta.minimumHeightPx}px` }}
					>
						{children}
					</Link>
				</Column>
			</Row>
			{fallback ? <FallbackLink href={href} /> : null}
		</Section>
	);
}

function Footer({ children }: { children: ReactNode }) {
	return (
		<Section className="resq-email-footer">
			<Hr className="resq-email-neutral-divider my-6 border-border" />
			<Text
				className="resq-email-muted font-sans text-xs text-muted"
				style={{ lineHeight: `${emailDesignContract.presentation.footer.lineHeightPx}px` }}
			>
				{children}
			</Text>
		</Section>
	);
}

/**
 * Compliance footer: legal entity + registered postal address, Terms/Privacy
 * links, and — for `marketing` sends only — unsubscribe and optional preference
 * controls. The effective category comes from the validated
 * {@link EmailMessageContext}. All copy is small and muted.
 */
function LegalFooter({ reason }: { reason?: ReactNode }) {
	const { org } = useContext(EmailThemeContext);
	const message = useContext(EmailMessageContext);
	// CAN-SPAM/GDPR: the homepage is not a valid opt-out, so neither legal control
	// ever falls back to `org.websiteUrl`.
	const unsubscribeHref = message.unsubscribeUrl;
	const preferencesHref = message.preferencesUrl;
	return (
		<Section className="resq-email-footer">
			<Signature />
			<Hr className="resq-email-neutral-divider my-6 border-border" />
			{reason ? (
				<Text
					className="resq-email-muted mb-2 font-sans text-xs text-muted"
					style={{ lineHeight: `${emailDesignContract.presentation.footer.lineHeightPx}px` }}
				>
					{reason}
				</Text>
			) : null}
			{/* `registeredAddress` already leads with the legal entity name, so it is a
			    complete CAN-SPAM postal line on its own — no separate `legalName`. */}
			<Text
				className="resq-email-muted mb-2 font-sans text-xs text-muted"
				style={{ lineHeight: `${emailDesignContract.presentation.footer.lineHeightPx}px` }}
			>
				{org.registeredAddress}
			</Text>
			<Text
				className="resq-email-muted mb-2 font-sans text-xs text-muted"
				style={{ lineHeight: `${emailDesignContract.presentation.footer.lineHeightPx}px` }}
			>
				<Link href={org.termsUrl} className="resq-email-muted text-muted underline">
					Terms
				</Link>
				{" · "}
				<Link href={org.privacyUrl} className="resq-email-muted text-muted underline">
					Privacy
				</Link>
			</Text>
			{message.category === "marketing" && unsubscribeHref ? (
				<Text
					className="resq-email-muted font-sans text-xs text-muted"
					style={{ lineHeight: `${emailDesignContract.presentation.footer.lineHeightPx}px` }}
				>
					<Link href={unsubscribeHref} className="resq-email-muted text-muted underline">
						Unsubscribe
					</Link>
					{preferencesHref ? (
						<>
							{" · "}
							<Link href={preferencesHref} className="resq-email-muted text-muted underline">
								Manage preferences
							</Link>
						</>
					) : null}
				</Text>
			) : null}
		</Section>
	);
}

//#endregion

//#region Public API

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

//#endregion
