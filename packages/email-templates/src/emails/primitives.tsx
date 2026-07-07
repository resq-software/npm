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

import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { type ReactNode, useContext } from "react";
import {
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

/** Primary call-to-action — brand primary, mono, uppercase, tracked (per style guide). */
function CTA({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Section className="my-6">
			<Button
				href={href}
				className="box-border block rounded-md bg-primary px-8 py-3.5 text-center font-mono text-sm font-medium uppercase tracking-wide text-white no-underline"
			>
				{children}
			</Button>
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
 * Compound email primitives. Templates compose only from these so styling stays
 * consistent, theme-driven, and email-client safe. The raw react-email
 * `Section`, `Text`, `Link`, and `Hr` are re-exported for templates that need
 * finer control.
 */
export const Email: {
	readonly Shell: typeof Shell;
	readonly Title: typeof Title;
	readonly Paragraph: typeof Paragraph;
	readonly Code: typeof Code;
	readonly CTA: typeof CTA;
	readonly Footer: typeof Footer;
	readonly Section: typeof Section;
	readonly Text: typeof Text;
	readonly Link: typeof Link;
	readonly Hr: typeof Hr;
} = {
	Shell,
	Title,
	Paragraph,
	Code,
	CTA,
	Footer,
	Section,
	Text,
	Link,
	Hr,
};
