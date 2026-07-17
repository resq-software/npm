/**
 *
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
 *
 */

/**
 * @fileoverview ResQ-specific analytics primitives — branded {@link CookieDomain}
 * and {@link Ga4MeasurementId} types with their validating smart constructors,
 * plus the cross-subdomain allow-list. Centralised so the three consumers
 * (`resq-software/landing`, `resq-software/research`, `resq-software/viz`) share
 * one source of truth for subdomains and the GA4 ID format.
 *
 * @module @resq-systems/analytics/resq
 */

import { type Brand, brandRefiner, unsafeBrand } from "@resq-systems/types";

//#region Subdomains

/**
 * Cross-subdomain allow-list for GA4 cross-domain linking.
 *
 * Pass to `AnalyticsConfig.ga4.domains` so gtag adds `?_gl=` decorators
 * to outbound links between these hosts and stops counting cross-subdomain
 * navigation as referral traffic.
 *
 * Note: the linker only works *within a single GA4 property*. ResQ runs
 * a property per subdomain by deliberate operator choice, which means the
 * decorator is a no-op in practice — included anyway so the moment you
 * consolidate to a single property (or roll up via GA4 360), it just
 * works.
 */
export const RESQ_SUBDOMAIN_ALLOWLIST = [
	"resq.software",
	"research.resq.software",
	"viz.resq.software",
] as const;

/**
 * A host known to belong to the ResQ cross-subdomain family. Derived from
 * {@link RESQ_SUBDOMAIN_ALLOWLIST} so adding a subdomain updates the type in
 * lockstep with the runtime value.
 */
export type ResqSubdomain = (typeof RESQ_SUBDOMAIN_ALLOWLIST)[number];

//#endregion

//#region GA4 Measurement ID

/**
 * A GA4 Measurement ID that has been validated against {@link GA4_ID_PATTERN}.
 *
 * Branding separates a checked ID from an arbitrary env string at the type
 * level: only {@link sanitizeGa4Id} (the validated boundary) can mint one, so a
 * raw `process.env.*` value can never reach a gtag sink by accident.
 */
export type Ga4MeasurementId = Brand<string, "Ga4MeasurementId">;

/**
 * Strict GA4 Measurement ID shape per Google's documented format:
 * `G-` followed by 6–32 uppercase ASCII letters / digits.
 *
 * Used as a sanitizer before interpolating an env-var-sourced ID into an
 * inline `<script>` body. Even though `NEXT_PUBLIC_*` values are
 * build-time controlled, validating with a regex makes the taint flow
 * provably safe — closes static-analysis warnings (CodeQL
 * `js/bad-code-sanitization`) for free and prevents accidental
 * `</script>` / line-terminator escapes.
 */
export const GA4_ID_PATTERN = /^G-[A-Z0-9]{6,32}$/;

/**
 * Validate a GA4 Measurement ID against {@link GA4_ID_PATTERN}.
 *
 * Pure and total: never throws, has no effects, and treats any non-matching or
 * nullish input as a failed validation rather than an error.
 *
 * @param id - The candidate ID, typically `import.meta.env.VITE_GA4_ID`
 *   or `process.env.NEXT_PUBLIC_GA4_ID`. Accepts `null`/`undefined` for
 *   convenience so call sites don't need a guard around env-var reads
 *   or nullable config fields.
 * @returns The validated {@link Ga4MeasurementId} when `id` matches Google's
 *   format, otherwise the `null` sentinel (also returned for empty, `null`, or
 *   `undefined` input). Skip GA4 init entirely when this returns `null`.
 * @example
 * ```ts
 * sanitizeGa4Id("G-ABC123"); // → branded "G-ABC123"
 * sanitizeGa4Id("not-an-id"); // → null
 * sanitizeGa4Id(undefined); // → null
 * ```
 */
export function sanitizeGa4Id(id: string | null | undefined): Ga4MeasurementId | null {
	if (!id) return null;
	return GA4_ID_PATTERN.test(id) ? unsafeBrand<"Ga4MeasurementId", string>(id) : null;
}

//#endregion

//#region Cookie Domain

/**
 * A normalized cross-subdomain cookie domain in leading-dot form
 * (e.g. `.resq.software`).
 *
 * The leading dot is load-bearing: it tells the browser to scope the cookie to
 * a registrable root *and every subdomain under it* — the entire point of the
 * cross-subdomain analytics setup. A bare `resq.software` (no dot) is silently
 * rejected by the browser as a domain mismatch, breaking analytics with no
 * error.
 *
 * Branding makes "this string has been normalized to a valid leading-dot
 * domain" a compile-time fact: only {@link toCookieDomain} (or the guard
 * {@link isCookieDomain}) can mint one, so an unnormalized host can never reach
 * the PostHog / GA4 cookie sink by accident.
 */
export type CookieDomain = Brand<string, "CookieDomain">;

/**
 * A well-formed leading-dot cookie domain: a leading `.`, then two or more
 * lowercase DNS labels separated by dots. Each label starts and ends
 * alphanumeric and may contain internal hyphens (RFC 1123). Requiring ≥2 labels
 * rejects a rootless `.localhost` while accepting `.resq.software` and
 * `.app.example.com`.
 */
const COOKIE_DOMAIN_PATTERN =
	/^\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

const cookieDomainRefiner = brandRefiner<string, "CookieDomain">(
	(value) => COOKIE_DOMAIN_PATTERN.test(value),
	"cookie domain",
);

/**
 * Type guard: narrows a string to {@link CookieDomain} when it is *already* in
 * normalized leading-dot form. Does **not** normalize — reach for
 * {@link toCookieDomain} when the input may be a bare host.
 */
export const isCookieDomain: (value: string) => value is CookieDomain = cookieDomainRefiner.is;

/**
 * Smart constructor for {@link CookieDomain}. Normalizes, then validates:
 *
 * 1. trims surrounding whitespace,
 * 2. lowercases (hostnames are case-insensitive per RFC 3986 §3.2.2),
 * 3. strips a trailing dot (FQDN root form),
 * 4. prepends the leading dot when missing.
 *
 * Pure and total: never throws. A single-label host (`"localhost"`), an empty
 * or whitespace-only string, or a non-string short-circuits to the `null`
 * sentinel rather than an error.
 *
 * @param host - A host or cookie domain, with or without a leading dot
 *   (`"resq.software"`, `".resq.software"`, `"App.Example.com."`). `null` /
 *   `undefined` short-circuit to `null`.
 * @returns The branded, normalized {@link CookieDomain}, or the `null` sentinel
 *   when the input is not a valid multi-label host.
 * @example
 * ```ts
 * toCookieDomain("App.Example.com."); // → branded ".app.example.com"
 * toCookieDomain(".resq.software"); // → branded ".resq.software"
 * toCookieDomain("localhost"); // → null (single label)
 * ```
 */
export function toCookieDomain(host: string | null | undefined): CookieDomain | null {
	if (typeof host !== "string") return null;
	const trimmed = host.trim().toLowerCase().replace(/\.$/, "");
	if (trimmed.length === 0) return null;
	const withLeadingDot = trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
	return cookieDomainRefiner.coerce(withLeadingDot);
}

/**
 * The production ResQ cookie domain, validated once at module load. Reused by
 * {@link resolveResqCookieDomain} so the literal is minted through the refiner
 * rather than an ad-hoc cast.
 */
const RESQ_COOKIE_DOMAIN = cookieDomainRefiner.from(".resq.software");

/**
 * Resolve the production ResQ cookie domain only when the current host
 * actually lives under `resq.software`.
 *
 * Cloudflare/Vercel preview URLs and `localhost` would otherwise have
 * their cookie rejected by the browser with a domain mismatch, silently
 * breaking analytics in every non-prod environment. This guards that
 * path so the package can ship safe defaults.
 *
 * Hostnames are case-insensitive per RFC 3986 §3.2.2. Browsers normalize
 * `window.location.hostname` to lowercase, but server-side reads of the
 * `Host` header can carry whatever casing the client sent — normalize
 * here so a stray `RESQ.SOFTWARE` from a Workers `request.headers` read
 * still returns the cookie domain.
 *
 * Pure and total: never throws. A host outside the `resq.software` root, an
 * empty string, or a nullish argument yields the `undefined` sentinel.
 *
 * @param host - The current hostname. In a browser, pass
 *   `window.location.hostname`. On the server pass the `Host` header
 *   value, or `null` / `undefined` (or call without an argument) to
 *   short-circuit cleanly.
 * @returns the branded `".resq.software"` {@link CookieDomain} when `host`
 *   belongs to that registrable root, otherwise the `undefined` sentinel —
 *   assign the result directly to `AnalyticsConfig.cookieDomain`.
 * @example
 * ```ts
 * resolveResqCookieDomain("viz.resq.software"); // → branded ".resq.software"
 * resolveResqCookieDomain("preview-abc.vercel.app"); // → undefined
 * resolveResqCookieDomain("localhost"); // → undefined
 * ```
 */
export function resolveResqCookieDomain(
	host?: string | null | undefined,
): CookieDomain | undefined {
	if (typeof host !== "string" || host.length === 0) return undefined;
	const normalized = host.toLowerCase();
	if (normalized === "resq.software" || normalized.endsWith(".resq.software")) {
		return RESQ_COOKIE_DOMAIN;
	}
	return undefined;
}

//#endregion
