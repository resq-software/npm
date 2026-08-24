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
 * @fileoverview Mailer factory — composes template definitions into a typed,
 * discriminated `{ name, to, data }` contract with a boundary decoder, a registry,
 * and a headless renderer.
 *
 * @module @resq-systems/email-templates/mailer
 */

import { render } from "@react-email/render";
import { Cause, Exit, Schema } from "effect";
import type { ReactElement } from "react";
import {
	type EmailMessage,
	type EmailThemeOverride,
	withEmailMessage,
	withEmailTheme,
} from "./emails/theme.js";
import { EmailAddress, HttpUrl, emailCategory } from "./schemas.js";

//#region Constants

/**
 * Recipient schema for every payload's `to`. Validated (not a bare
 * `Schema.String`) so a malformed or header-injecting address is rejected at
 * the decode boundary and the decoded `to` carries the {@link EmailAddress}
 * brand all the way to the provider.
 */
const Recipient = EmailAddress;

//#endregion

//#region Types

/**
 * A template definition: its discriminant {@link EmailTemplateDef.name}, `data`
 * schema, subject builder, and React component.
 *
 * `name` must be unique across the defs handed to {@link createMailer} — it is the
 * payload union's discriminant, and a later def with a duplicate name silently
 * overwrites the earlier one in the registry (last write wins in
 * `Object.fromEntries`). `subject` and `Component` are only ever invoked with data
 * that has already cleared `data`'s schema at the decode boundary, so they may
 * treat every field as valid and should stay pure.
 *
 * @template Name - The literal template name (e.g. `"otp"`); the payload discriminant.
 * @template DataSchema - The Effect Schema whose decoded `Type` is this template's `data`.
 */
export interface EmailTemplateDef<Name extends string, DataSchema extends Schema.Top> {
	/** Unique template name; the payload union's discriminant. */
	readonly name: Name;
	/** Effect Schema that validates this template's `data` at the decode boundary. */
	readonly data: DataSchema;
	/** Builds the subject line from already-validated `data`. Should be pure. */
	readonly subject: (data: DataSchema["Type"]) => string;
	/** Renders the email body from already-validated `data`. */
	readonly Component: (data: DataSchema["Type"]) => ReactElement;
}

/**
 * Identity helper that infers and preserves a template def's literal types.
 *
 * Pure — returns `def` by reference, unchanged. It exists only so the `const` type
 * parameters capture the literal `name` and the schema's `Type` at the call site;
 * a bare object literal would widen `name` to `string` and lose the discriminant.
 *
 * @template Name - The literal template name; preserved via the `const` modifier.
 * @template DataSchema - The template's `data` schema.
 * @param def - The template definition to brand with its inferred literal types.
 * @returns The same `def` object, typed with its narrowed literals.
 */
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

/** The shared payload fields for a single template definition. */
type PayloadFor<Def> =
	Def extends EmailTemplateDef<infer Name, infer DataSchema>
		? {
				readonly name: Name;
				readonly to: EmailAddress;
				readonly data: DataSchema["Type"];
				/** Compliance class for this send; defaults to `transactional`. */
				readonly category?: "transactional" | "marketing";
				/** Required opt-out destination for marketing sends. */
				readonly unsubscribeUrl?: string;
				/** Optional preference-management destination for marketing sends. */
				readonly preferencesUrl?: string;
			}
		: never;

/**
 * The discriminated payload union for a tuple of template defs — one
 * `{ name, to, data, category?, unsubscribeUrl?, preferencesUrl? }` variant per def, discriminated
 * by the literal `name` field. Narrow a value with `payload.name` to recover the
 * matching `data` type.
 *
 * @template Defs - The `as const` tuple of template defs the union is built over.
 */
export type MailerPayload<Defs extends readonly AnyTemplateDef[]> = PayloadFor<Defs[number]>;

/**
 * The `data` type for a given template name within a set of defs — the `data`
 * field of the {@link MailerPayload} variant whose discriminant equals `Name`.
 *
 * @template Defs - The tuple of template defs the payload union is built over.
 * @template Name - The literal `name` selecting a single variant's `data` shape.
 */
export type MailerTemplateData<
	Defs extends readonly AnyTemplateDef[],
	Name extends MailerPayload<Defs>["name"],
> = Extract<MailerPayload<Defs>, { name: Name }>["data"];

/**
 * The rendered, provider-ready email — the resolved output of
 * {@link Mailer.renderEmail}. `html` and `text` are two renderings of the *same*
 * message, so a provider may attach both as a multipart alternative.
 */
export interface RenderedEmail {
	/** Validated recipient (branded {@link EmailAddress}), carried through from decode. */
	to: EmailAddress;
	/** The subject line produced by the template's `subject` builder. */
	subject: string;
	/** The complete standalone HTML document for the email body. */
	html: string;
	/** The plain-text alternative rendering of the same body, for text-only clients. */
	text: string;
}

/** Options for a mailer's `renderEmail`. */
export interface RenderEmailOptions {
	/** Rebrand this render by overriding theme colors/fonts (see `EmailThemeOverride`). */
	theme?: EmailThemeOverride;
}

/**
 * Thrown when an untrusted payload fails schema validation at the decode boundary
 * ({@link Mailer.decode}, and transitively {@link Mailer.renderEmail}).
 *
 * The `message` is the squashed Effect `Cause` from the failed decode; `name` is
 * the stable literal `"EmailValidationError"`, so a caller can tell a bad payload
 * apart from other failures by `name` without relying on `instanceof` across
 * module/realm boundaries.
 */
export class EmailValidationError extends Error {
	override readonly name = "EmailValidationError";
}

/**
 * A registry entry: the subject builder and component renderer for one template.
 *
 * Both functions take `unknown` because the registry is keyed by name and has
 * erased each def's `data` type. They must only be called with data that has
 * already passed that template's schema (as {@link Mailer.renderEmail} does after
 * {@link Mailer.decode}); calling them with unvalidated data is unsound.
 */
export interface EmailRegistryEntry {
	/** Builds the subject from validated `data` (typed `unknown` after name-erasure). */
	subject: (data: unknown) => string;
	/** Renders the body element from validated `data` (typed `unknown` after name-erasure). */
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
	/** Every registered template name, in def order. */
	readonly names: readonly Payload["name"][];
	/**
	 * Validate an untrusted payload against the contract union and return the
	 * narrowed {@link Payload}.
	 *
	 * @param input - Untrusted `{ name, to, data }` value from the boundary.
	 * @returns The validated, branded payload.
	 * @throws {EmailValidationError} If `input` matches no template variant — bad
	 *   `name`, a malformed/header-injecting `to`, or `data` failing its schema.
	 */
	decode(input: unknown): Payload;
	/**
	 * Validate then render a payload to `{ to, subject, html, text }`.
	 *
	 * Validates via {@link decode} first, then renders headlessly through
	 * `@react-email/render` — no browser, DOM, network, or clock — so it is safe in
	 * queue workers and cron jobs. Pure and stateless: concurrent calls against one
	 * mailer do not interfere, and there is no ordering guarantee between them. Does
	 * not honour an `AbortSignal`.
	 *
	 * @param input - Untrusted payload to validate and render.
	 * @param options - Optional per-render theme override.
	 * @returns A promise resolving to the rendered email.
	 * @throws {EmailValidationError} As a rejected promise, when `input` fails
	 *   validation (surfaced from {@link decode}).
	 */
	renderEmail(input: unknown, options?: RenderEmailOptions): Promise<RenderedEmail>;
}

//#endregion

//#region Public API

/**
 * Compose template definitions into a typed mailer: a discriminated
 * `{ name, to, data }` contract, a boundary decoder, a registry, and a headless
 * renderer. Spread the built-in `resqEmailTemplates` and add your own — each
 * template's `data` is validated by its Effect Schema.
 *
 * Pure: builds the schema union and registry eagerly and holds no mutable state;
 * the returned `decode`/`renderEmail` are the only fallible surfaces. `defs`
 * should have unique `name`s — a duplicate makes the later def win in the registry
 * while both remain in the schema union (see {@link EmailTemplateDef}).
 *
 * @template Defs - The `as const` tuple of template defs to compose.
 * @param defs - The template definitions; pass `[...resqEmailTemplates, myDef]` to extend the built-ins.
 * @returns A {@link Mailer} whose `decode` throws (and `renderEmail` rejects with)
 *   {@link EmailValidationError} on invalid input.
 * @example
 * ```ts
 * const mailer = createMailer(resqEmailTemplates);
 * const { subject } = await mailer.renderEmail({
 *   name: "otp",
 *   to: "user@example.com",
 *   data: { code: "123456" },
 * });
 * subject; // → "Your ResQ Systems verification code: 123456"
 * ```
 */
export function createMailer<const Defs extends readonly AnyTemplateDef[]>(
	defs: Defs,
): Mailer<MailerPayload<Defs>> {
	type Payload = MailerPayload<Defs>;

	// `Schema.Union(defs.map(...))` maps the def tuple to an array, widening each
	// struct's literal `name` and collapsing the discriminant, so TS can't prove the
	// union's decoded type is the `Payload` union. Assert it as a services-free
	// `Codec<Payload, unknown>` (every field schema decodes without services — cf.
	// `@resq-systems/http`'s `SyncSchema`); `decode` returns the narrowed value.
	const schema = Schema.Union(
		defs.map((def) =>
			Schema.Struct({
				name: Schema.Literal(def.name),
				to: Recipient,
				data: def.data,
				category: Schema.optional(emailCategory),
				unsubscribeUrl: Schema.optional(HttpUrl),
				preferencesUrl: Schema.optional(HttpUrl),
			}),
		),
	) as unknown as Schema.Codec<Payload, unknown, never>;

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

	const decodeExit = Schema.decodeUnknownExit(schema);

	function decode(input: unknown): Payload {
		const result = decodeExit(input);
		if (Exit.isFailure(result)) {
			const squashed = Cause.squash(result.cause);
			throw new EmailValidationError(
				squashed instanceof Error ? squashed.message : String(squashed),
			);
		}
		const payload = result.value;
		if (payload.category === "marketing" && payload.unsubscribeUrl === undefined) {
			throw new EmailValidationError("marketing email requires unsubscribeUrl");
		}
		return payload;
	}

	async function renderEmail(input: unknown, options?: RenderEmailOptions): Promise<RenderedEmail> {
		const payload = decode(input);
		const entry = registry[payload.name as string];
		const message: EmailMessage = {
			category: payload.category ?? "transactional",
			unsubscribeUrl: payload.unsubscribeUrl,
			preferencesUrl: payload.preferencesUrl,
		};
		const element = withEmailMessage(
			withEmailTheme(entry.render(payload.data), options?.theme),
			message,
		);
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

//#endregion
