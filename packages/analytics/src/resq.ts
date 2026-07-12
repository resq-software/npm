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
 * ResQ-specific helpers shared by the three analytics consumers
 * (`resq-software/landing`, `resq-software/research`, `resq-software/viz`).
 * Keeping these in the package means adding a fourth subdomain or
 * tightening the GA4 ID format becomes a single version bump instead of
 * three coordinated edits.
 */

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
export const RESQ_SUBDOMAIN_ALLOWLIST: readonly string[] = [
	"resq.software",
	"research.resq.software",
	"viz.resq.software",
];

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
 * @param id - The candidate ID, typically `import.meta.env.VITE_GA4_ID`
 *   or `process.env.NEXT_PUBLIC_GA4_ID`. Accepts `null`/`undefined` for
 *   convenience so call sites don't need a guard around env-var reads
 *   or nullable config fields.
 * @returns The validated ID when it matches Google's format, otherwise
 *   `null`. Skip GA4 init entirely when this returns `null`.
 */
export function sanitizeGa4Id(id: string | null | undefined): string | null {
	if (!id) return null;
	return GA4_ID_PATTERN.test(id) ? id : null;
}

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
 * @param host - The current hostname. In a browser, pass
 *   `window.location.hostname`. On the server pass the `Host` header
 *   value, or `null` / `undefined` (or call without an argument) to
 *   short-circuit cleanly.
 * @returns `".resq.software"` when `host` belongs to that registrable
 *   root, otherwise `undefined` — assign the result directly to
 *   `AnalyticsConfig.cookieDomain`.
 */
export function resolveResqCookieDomain(host?: string | null | undefined): string | undefined {
	if (typeof host !== "string" || host.length === 0) return undefined;
	const normalized = host.toLowerCase();
	if (normalized === "resq.software" || normalized.endsWith(".resq.software")) {
		return ".resq.software";
	}
	return undefined;
}
