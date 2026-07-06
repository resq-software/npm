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

import { render } from "@react-email/render";
import { Cause, Exit, Schema } from "effect";
import type { ReactElement } from "react";
import { type EmailThemeOverride, withEmailTheme } from "./emails/theme.js";

const Recipient = Schema.String;

/** A template definition: its name, `data` schema, subject line, and component. */
export interface EmailTemplateDef<Name extends string, DataSchema extends Schema.Top> {
	readonly name: Name;
	readonly data: DataSchema;
	readonly subject: (data: DataSchema["Type"]) => string;
	readonly Component: (data: DataSchema["Type"]) => ReactElement;
}

/** Identity helper that infers and preserves a template def's literal types. */
export function defineEmailTemplate<const Name extends string, DataSchema extends Schema.Top>(
	def: EmailTemplateDef<Name, DataSchema>,
): EmailTemplateDef<Name, DataSchema> {
	return def;
}

/**
 * The common supertype for a heterogeneous list of template defs. The `never`
 * parameters make every concrete `EmailTemplateDef<Name, DataSchema>` assignable
 * here (function parameters are contravariant), so defs with different `data`
 * types can live in one array.
 */
interface AnyTemplateDef {
	readonly name: string;
	readonly data: Schema.Top;
	readonly subject: (data: never) => string;
	readonly Component: (data: never) => ReactElement;
}

/** The `{ name, to, data }` payload for a single template def. */
type PayloadFor<Def> =
	Def extends EmailTemplateDef<infer Name, infer DataSchema>
		? { readonly name: Name; readonly to: string; readonly data: DataSchema["Type"] }
		: never;

/** The discriminated payload union for a tuple of template defs. */
export type MailerPayload<Defs extends readonly AnyTemplateDef[]> = PayloadFor<Defs[number]>;

/** The `data` type for a given template name within a set of defs. */
export type MailerTemplateData<
	Defs extends readonly AnyTemplateDef[],
	Name extends MailerPayload<Defs>["name"],
> = Extract<MailerPayload<Defs>, { name: Name }>["data"];

/** The rendered, provider-ready email. */
export interface RenderedEmail {
	to: string;
	subject: string;
	html: string;
	text: string;
}

/** Options for a mailer's `renderEmail`. */
export interface RenderEmailOptions {
	/** Rebrand this render by overriding theme colors/fonts (see `EmailThemeOverride`). */
	theme?: EmailThemeOverride;
}

/** Thrown when an untrusted payload fails schema validation at the boundary. */
export class EmailValidationError extends Error {
	override readonly name = "EmailValidationError";
}

/** A registry entry: the subject builder and component renderer for one template. */
export interface EmailRegistryEntry {
	subject: (data: unknown) => string;
	render: (data: unknown) => ReactElement;
}

/** A composed set of templates: contract schema, decoder, registry, and renderer. */
export interface Mailer<
	Payload extends { readonly name: string; readonly to: string; readonly data: unknown },
> {
	/** The Effect Schema union describing every `{ name, to, data }` payload. */
	readonly schema: Schema.Top;
	/** name → { subject, render } for every template. */
	readonly registry: Record<Payload["name"], EmailRegistryEntry>;
	/** Every registered template name. */
	readonly names: readonly Payload["name"][];
	/** Validate an untrusted payload (throws {@link EmailValidationError}). */
	decode(input: unknown): Payload;
	/** Validate then render to `{ to, subject, html, text }` (headless, pipeline-safe). */
	renderEmail(input: unknown, options?: RenderEmailOptions): Promise<RenderedEmail>;
}

/**
 * Compose template definitions into a typed mailer: a discriminated
 * `{ name, to, data }` contract, a boundary decoder, a registry, and a headless
 * renderer. Spread the built-in `resqEmailTemplates` and add your own — each
 * template's `data` is validated by its Effect Schema.
 */
export function createMailer<const Defs extends readonly AnyTemplateDef[]>(
	defs: Defs,
): Mailer<MailerPayload<Defs>> {
	type Payload = MailerPayload<Defs>;

	const schema = Schema.Union(
		defs.map((def) =>
			Schema.Struct({ name: Schema.Literal(def.name), to: Recipient, data: def.data }),
		),
	);

	// Entries are stored with `unknown` params; the def's data type is enforced at
	// the call boundary by `decode`, so these casts are safe.
	const registry: Record<string, EmailRegistryEntry> = Object.fromEntries(
		defs.map((def) => [
			def.name,
			{
				subject: def.subject as EmailRegistryEntry["subject"],
				render: def.Component as EmailRegistryEntry["render"],
			},
		]),
	);

	const names = defs.map((def) => def.name);

	// Cast past the `Decoder` services constraint: the union's fields are concrete
	// schemas with no decoding services at runtime.
	const decodeExit = Schema.decodeUnknownExit(
		schema as unknown as Parameters<typeof Schema.decodeUnknownExit>[0],
	);

	function decode(input: unknown): Payload {
		const result = decodeExit(input);
		if (Exit.isFailure(result)) {
			const squashed = Cause.squash(result.cause);
			throw new EmailValidationError(
				squashed instanceof Error ? squashed.message : String(squashed),
			);
		}
		return result.value as Payload;
	}

	async function renderEmail(input: unknown, options?: RenderEmailOptions): Promise<RenderedEmail> {
		const payload = decode(input);
		const entry = registry[payload.name as string];
		const element = withEmailTheme(entry.render(payload.data), options?.theme);
		const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
		return { to: payload.to, subject: entry.subject(payload.data), html, text };
	}

	return {
		schema,
		registry: registry as Record<Payload["name"], EmailRegistryEntry>,
		names: names as readonly Payload["name"][],
		decode,
		renderEmail,
	};
}
