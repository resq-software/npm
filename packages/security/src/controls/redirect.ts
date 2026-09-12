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
 * @fileoverview Allowlisted resolution of redirect and forward destinations
 * (CWE-601) — decides whether a caller-supplied `next` value may be placed in a
 * `Location` header.
 *
 * @module @resq-systems/security/controls/redirect
 */

//#region Types

/** Why a redirect target was refused. */
export type RedirectRejectionReason =
	/** Not a string, or empty after trimming. */
	| "malformed"
	/** Longer than the configured bound. */
	| "too_long"
	/** Contains a character that lets the target escape the origin. */
	| "control_character"
	/** Opens a network-path reference and would leave the site. */
	| "opens_authority"
	/** Absolute URL using a scheme other than http or https. */
	| "unsupported_scheme"
	/** Absolute URL whose host is not allowlisted. */
	| "host_not_allowed";

/** Outcome of {@link resolveRedirectTarget}. */
export type RedirectVerdict =
	| { readonly allowed: true; readonly target: string }
	| { readonly allowed: false; readonly reason: RedirectRejectionReason };

/** Policy for {@link resolveRedirectTarget}. */
export interface RedirectPolicyOptions {
	/**
	 * Hosts an absolute target may point at, compared case-insensitively against the
	 * parsed host. Omit to refuse every absolute URL — the safer default, and the right
	 * one for a `next=` parameter.
	 */
	readonly allowedHosts?: readonly string[];
	/**
	 * Longest target accepted. Defaults to 2048: comfortably above any real return path,
	 * and below the length at which proxies begin truncating a `Location` value.
	 */
	readonly maxLength?: number;
}

//#endregion

//#region Implementation

/** Default bound on a redirect target. */
const DEFAULT_MAX_LENGTH = 2048;

/**
 * Characters that must never appear in a redirect target.
 *
 * C0, C1, and the two Unicode line terminators. Tab, LF and CR are the load-bearing
 * members: the URL parser strips them *before* resolving, so a tab between the leading
 * slash and a host resolves to a network-path reference and leaves the site — while the
 * authority test below, which reads only the literal leading characters, sees an
 * ordinary path.
 *
 * Sweeping U+0000-U+3000 for targets shaped `/<cp>/host` finds exactly five code points
 * that escape the origin: tab, LF, CR, and the two slashes. The authority test catches
 * the slashes and none of the first three, and all three of those are control
 * characters. That is why this test runs first; reordering the two reopens the hole
 * silently.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are the bypass
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

/**
 * A network-path reference: two leading slashes, in either direction.
 *
 * Inlined rather than imported from `sanitize.ts`, which statically imports `effect` —
 * an optional peer. Importing it here would make the entire `./controls` subpath fail to
 * load for a consumer who never installed `effect`.
 */
const OPENS_AUTHORITY = /^[/\\]{2}/;

/**
 * Decide whether a caller-supplied value may be used as a redirect destination.
 *
 * The classic post-login `?next=` bug (CWE-601): a value that looks like a path but
 * resolves to another origin, so the site itself delivers the victim to the attacker
 * with its own credibility attached.
 *
 * An **allowlist**, per the OWASP Unvalidated Redirects and Forwards cheat sheet. Two
 * things are accepted: a same-site path beginning with a single slash, and — only when
 * `allowedHosts` names the host — an absolute `http`/`https` URL. Everything else is
 * refused with a reason, including the schemes that never belong in a `Location` header.
 *
 * Percent-encoded control bytes are **accepted deliberately**: `%0d%0a` stays literal in
 * a `Location` value and does not split a header, so refusing it would reject ordinary
 * URLs whose paths carry encoded data.
 *
 * @param target - Untrusted destination, typically a query parameter.
 * @param options - Policy. Absolute URLs are refused unless `allowedHosts` names the host.
 * @returns A discriminated verdict: the trimmed target, or the reason it was refused.
 *
 * @example
 * ```ts
 * resolveRedirectTarget("/dashboard?tab=recent");
 * // { allowed: true, target: "/dashboard?tab=recent" }
 *
 * resolveRedirectTarget("https://partner.example/sso", { allowedHosts: ["partner.example"] });
 * // { allowed: true, target: "https://partner.example/sso" }
 * ```
 */
export function resolveRedirectTarget(
	target: string,
	options: RedirectPolicyOptions = {},
): RedirectVerdict {
	if (typeof target !== "string") return { allowed: false, reason: "malformed" };

	// Trimmed once, at entry. Leading whitespace otherwise survives the relative-path
	// test and reaches the absolute parse, where `new URL` trims it anyway — so a
	// space-prefixed network-path reference would be judged by a different branch than
	// the bare one.
	const trimmed = target.trim();
	if (trimmed.length === 0) return { allowed: false, reason: "malformed" };

	const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
	if (trimmed.length > maxLength) return { allowed: false, reason: "too_long" };

	// Order matters — see UNSAFE_CHARS. This must precede the authority test.
	if (UNSAFE_CHARS.test(trimmed)) return { allowed: false, reason: "control_character" };

	if (OPENS_AUTHORITY.test(trimmed)) return { allowed: false, reason: "opens_authority" };

	// A single leading slash is a same-site path, and the two tests above have already
	// ruled out everything that could make it resolve elsewhere.
	if (trimmed.startsWith("/")) return { allowed: true, target: trimmed };

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		// Neither absolute nor rooted — a bare relative path such as "dashboard", which
		// resolves against the current directory and cannot change origin.
		return { allowed: true, target: trimmed };
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return { allowed: false, reason: "unsupported_scheme" };
	}

	// Compared against the *parsed* host, so userinfo cannot disguise the destination:
	// a URL whose userinfo is a trusted name still parses with the attacker's host.
	const allowedHosts = options.allowedHosts ?? [];
	const host = parsed.host.toLowerCase();
	const permitted = allowedHosts.some((candidate) => candidate.trim().toLowerCase() === host);

	return permitted
		? { allowed: true, target: trimmed }
		: { allowed: false, reason: "host_not_allowed" };
}

//#endregion
