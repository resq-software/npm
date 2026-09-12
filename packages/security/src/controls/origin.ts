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
 * @fileoverview CORS origin validation — the control for WSTG-CLNT-07.
 *
 * No signature helps here: `Origin: https://evil.example` is byte-identical in shape to
 * a legitimate origin, and the vulnerability lives in how the *server* decides to
 * reflect it. So this is a decision function, not a detector.
 *
 * Every real-world CORS bypass comes from one of four shortcuts, and each is refused
 * explicitly below:
 *
 * 1. `startsWith` / `includes` matching — `https://example.com.evil.test` passes a
 *    prefix check and `https://evil-example.com` passes a substring check.
 * 2. Reflecting the request's own `Origin` header into `Access-Control-Allow-Origin`.
 * 3. Accepting the literal `null` origin, which any sandboxed iframe or `data:`
 *    document can send.
 * 4. Pairing `Access-Control-Allow-Origin: *` with
 *    `Access-Control-Allow-Credentials: true`.
 *
 * @module @resq-systems/security/controls/origin
 */

//#region Normalization

/** Default ports omitted from an origin's serialized form. */
const DEFAULT_PORTS: Readonly<Record<string, string>> = {
	"http:": "80",
	"https:": "443",
	"ws:": "80",
	"wss:": "443",
};

/** Schemes an origin may use. Anything else is refused before comparison. */
const ALLOWED_SCHEMES = new Set(["http:", "https:", "ws:", "wss:"]);

/**
 * Reduce an origin string to its canonical serialized form.
 *
 * Lowercases the scheme and host, drops a redundant default port, and refuses anything
 * carrying a path, query, fragment, or userinfo — none of which belongs in an origin,
 * and each of which is a way to smuggle a different host past a careless comparison.
 *
 * @param origin - Raw `Origin` header value.
 * @returns The canonical origin (`https://example.com`, `https://example.com:8443`), or
 *   `null` when the value is not a well-formed, comparable origin. The literal `"null"`
 *   origin always yields `null`.
 *
 * @example
 * ```ts
 * normalizeOrigin("HTTPS://Example.COM:443"); // "https://example.com"
 * normalizeOrigin("https://example.com/path"); // null — origins carry no path
 * normalizeOrigin("null");                     // null
 * ```
 */
export function normalizeOrigin(origin: string): string | null {
	if (typeof origin !== "string") return null;

	const trimmed = origin.trim();
	// Any sandboxed iframe, `data:` document, or cross-origin redirect can present
	// `null`. It is never a grant of trust, so it never survives normalization.
	if (trimmed.length === 0 || trimmed === "null" || trimmed === "*") return null;

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return null;
	}

	if (!ALLOWED_SCHEMES.has(parsed.protocol)) return null;
	if (parsed.username !== "" || parsed.password !== "") return null;
	if (parsed.search !== "" || parsed.hash !== "") return null;
	// `new URL("https://example.com")` yields pathname "/", the only acceptable value;
	// anything longer means a path was supplied and this is not a bare origin.
	if (parsed.pathname !== "/") return null;
	if (parsed.hostname.length === 0) return null;

	const port = parsed.port === DEFAULT_PORTS[parsed.protocol] ? "" : parsed.port;
	const host = parsed.hostname.toLowerCase();
	return port === "" ? `${parsed.protocol}//${host}` : `${parsed.protocol}//${host}:${port}`;
}

//#endregion

//#region Matching

/** Options for {@link isAllowedOrigin}. */
export interface OriginPolicyOptions {
	/**
	 * Parent origins whose **subdomains** are also accepted. Matching is on label
	 * boundaries, so `https://example.com` admits `https://app.example.com` but never
	 * `https://example.com.evil.test` and never `https://notexample.com`.
	 *
	 * Off by default. Enabling it makes every subdomain as trusted as the parent —
	 * including any subdomain an attacker manages to take over, which is WSTG-CONF-10.
	 */
	readonly allowSubdomainsOf?: readonly string[];
}

/** True when `host` is a strict subdomain of `parentHost`, on a label boundary. */
function isSubdomainOf(host: string, parentHost: string): boolean {
	return host.length > parentHost.length && host.endsWith(`.${parentHost}`);
}

/**
 * Decide whether an origin is allowed.
 *
 * Both sides are normalized, then matched **exactly**. There is no prefix, suffix, or
 * substring path through this function, and no wildcard: the allowlist is a list of
 * origins, not a list of patterns.
 *
 * @param origin - The request's `Origin` header value.
 * @param allowlist - Origins to accept. Entries that fail normalization are skipped
 *   rather than silently widening the policy.
 * @param options - See {@link OriginPolicyOptions}.
 * @returns `true` only when the origin is well-formed and present in the allowlist.
 *
 * @example
 * ```ts
 * const ALLOWED = ["https://app.example.com", "https://admin.example.com"];
 *
 * if (isAllowedOrigin(req.headers.origin ?? "", ALLOWED)) {
 *   // Echo the *normalized allowlisted* value, never the raw request header.
 *   res.setHeader("Access-Control-Allow-Origin", normalizeOrigin(req.headers.origin)!);
 *   res.setHeader("Vary", "Origin");
 * }
 * ```
 */
export function isAllowedOrigin(
	origin: string,
	allowlist: readonly string[],
	options: OriginPolicyOptions = {},
): boolean {
	const candidate = normalizeOrigin(origin);
	if (candidate === null) return false;

	const entries = Array.isArray(allowlist) ? allowlist : [];
	for (const entry of entries) {
		if (normalizeOrigin(entry) === candidate) return true;
	}

	// Checked after the exact list, not instead of it: an empty `allowlist` combined
	// with a populated `allowSubdomainsOf` is a legitimate configuration, and an early
	// return on `allowlist.length === 0` would silently deny every request.
	const parents = options.allowSubdomainsOf;
	if (!Array.isArray(parents) || parents.length === 0) return false;

	// Scheme, port, and host are compared separately so a subdomain grant cannot also
	// downgrade the scheme or move the port.
	const candidateUrl = new URL(candidate);
	for (const parent of parents) {
		const normalizedParent = normalizeOrigin(parent);
		if (normalizedParent === null) continue;

		const parentUrl = new URL(normalizedParent);
		if (parentUrl.protocol !== candidateUrl.protocol) continue;
		if (parentUrl.port !== candidateUrl.port) continue;
		if (isSubdomainOf(candidateUrl.hostname, parentUrl.hostname)) return true;
	}

	return false;
}

//#endregion

//#region Policy assertion

/** A CORS response configuration, checked for the credentialed-wildcard mistake. */
export interface CorsResponsePolicy {
	/** Value destined for `Access-Control-Allow-Origin`. */
	readonly allowOrigin: string;
	/** Whether `Access-Control-Allow-Credentials: true` will be sent. */
	readonly allowCredentials: boolean;
}

/**
 * Reject the CORS combinations that browsers treat as an error and servers still ship:
 * `Access-Control-Allow-Origin: *` or `null` together with
 * `Access-Control-Allow-Credentials: true`.
 *
 * Call it where response headers are assembled, so the mistake fails a test rather than
 * reaching production.
 *
 * @param policy - The headers about to be sent.
 * @returns `null` when the combination is safe, otherwise a message naming the problem.
 */
export function checkCorsResponsePolicy(policy: CorsResponsePolicy): string | null {
	if (!policy.allowCredentials) return null;

	const value = policy.allowOrigin.trim();
	if (value === "*") {
		return "Access-Control-Allow-Origin: * cannot be combined with Access-Control-Allow-Credentials: true — name the exact origin instead";
	}
	if (value === "null") {
		return "Access-Control-Allow-Origin: null grants access to sandboxed and data: documents — name the exact origin instead";
	}
	return null;
}

//#endregion
