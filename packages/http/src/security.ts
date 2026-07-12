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
 * @file Security Middleware Utilities
 * @module @resq-systems/http/security
 * @author ResQ
 * @description Framework-agnostic security middleware logic.
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality), SC-23 (Session Authenticity)
 */

/**
 * Decide whether an inbound HTTP request must be redirected to HTTPS,
 * accounting for reverse-proxy and load-balancer hops that terminate
 * TLS upstream.
 *
 * The check inspects (in order) `x-forwarded-proto`, `x-forwarded-ssl`,
 * the raw `protocol`, and the URL prefix. A request is treated as
 * already-secure if **any** of these signals indicate HTTPS.
 *
 * In `development` and `test` environments the function always returns
 * `null` to avoid breaking local workflows that run plain HTTP.
 *
 * @param protocol - The protocol string from the request (e.g. `"http"`
 *   or `"https"`). Typically `req.protocol` or `req.url.protocol`.
 * @param url - Full request URL. Used both as a fallback signal and as
 *   the basis for the redirect target.
 * @param headers - Request headers. Only the proxy-related ones
 *   (`x-forwarded-proto`, `x-forwarded-ssl`) are consulted.
 * @param nodeEnv - Override for the environment guard. Defaults to
 *   `process.env.NODE_ENV` or `"development"`. Pass `"production"`
 *   explicitly when running outside Node (Bun, Deno, edge runtimes).
 *
 * @returns The redirect target (an `https://` URL) when a redirect is
 *   required, otherwise `null` (the request is already secure or in a
 *   non-prod environment).
 *
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality).
 *
 * @example
 * ```ts
 * const target = shouldRedirectToHttps(req.protocol, req.url, req.headers);
 * if (target) return Response.redirect(target, 301);
 * ```
 */
export function shouldRedirectToHttps(
	protocol: string,
	url: string,
	headers: Record<string, string | undefined>,
	nodeEnv: string = process.env.NODE_ENV || "development",
): string | null {
	// Skip in development/test environments
	if (nodeEnv === "development" || nodeEnv === "test") {
		return null;
	}

	// Check for HTTPS via various headers (handles proxies/load balancers)
	const forwardedProto = headers["x-forwarded-proto"];
	const forwardedSsl = headers["x-forwarded-ssl"];

	const isSecure =
		forwardedProto === "https" ||
		forwardedSsl === "on" ||
		protocol === "https" ||
		url.startsWith("https://");

	if (!isSecure) {
		const httpsUrl = new URL(url);
		httpsUrl.protocol = "https:";
		return httpsUrl.toString();
	}

	return null;
}

/**
 * Resolve the request ID for an inbound request — passing through any
 * caller-supplied value verbatim, otherwise minting a fresh UUID v4 via
 * `crypto.randomUUID()`.
 *
 * Use as the source of truth for the per-request correlation ID written
 * into log lines, response headers (`x-request-id`), and downstream
 * service hops. Trusting an upstream-supplied ID lets distributed
 * traces follow the request across service boundaries without
 * regeneration.
 *
 * @param existingId - Inbound `x-request-id` (or equivalent), if any.
 *   Returned unchanged when truthy; no validation is applied, so do not
 *   echo untrusted values into log structures without your own
 *   sanitization.
 *
 * @returns The supplied ID, or a freshly generated UUID v4.
 *
 * @example
 * ```ts
 * const requestId = getRequestId(req.headers["x-request-id"]);
 * res.headers.set("x-request-id", requestId);
 * logger.info("incoming request", { requestId, path: req.url });
 * ```
 */
export function getRequestId(existingId?: string): string {
	return existingId || crypto.randomUUID();
}
