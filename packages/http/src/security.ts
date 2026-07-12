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

import { type Brand, brandRefiner, type LiteralUnion, unsafeBrand } from "@resq-systems/types";

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
	protocol: LiteralUnion<"http" | "https">,
	url: string,
	headers: Record<string, string | undefined>,
	nodeEnv: LiteralUnion<"development" | "test" | "production"> = process.env.NODE_ENV ||
		"development",
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
 * A correlation ID that is safe to write into log lines, response headers, and
 * downstream service hops.
 *
 * The brand is nominal: a plain `string` is **not** assignable to `RequestId`.
 * The only way to obtain one is {@link sanitizeRequestId} (which strips a raw,
 * possibly-untrusted value down to a safe charset) or {@link getRequestId}.
 * This makes it a type error to log an unsanitized header value as a request ID.
 */
export type RequestId = Brand<string, "RequestId">;

/**
 * Maximum retained length of a sanitized request ID. Bounds log-line and header
 * size and blunts resource-exhaustion via an oversized inbound `x-request-id`.
 */
const MAX_REQUEST_ID_LENGTH = 200;

/**
 * Characters permitted in a request ID: URL-safe, header-safe, log-safe.
 * Anything outside `[A-Za-z0-9-_]` is a CRLF/log-injection or header-smuggling
 * risk, so it is dropped rather than escaped.
 */
const REQUEST_ID_ALLOWED = /^[A-Za-z0-9_-]+$/;

const requestIdRefiner = brandRefiner<string, "RequestId">(
	(value) =>
		value.length > 0 && value.length <= MAX_REQUEST_ID_LENGTH && REQUEST_ID_ALLOWED.test(value),
	"request ID",
);

/**
 * Type guard: narrows a `string` to {@link RequestId} when it already consists
 * solely of the safe charset and is within the length bound.
 */
export const isRequestId: (value: string) => value is RequestId = requestIdRefiner.is;

/**
 * Sanitize a raw, untrusted correlation ID into a {@link RequestId} — the ONLY
 * safe minting path for a caller-supplied value.
 *
 * Strips every character outside `[A-Za-z0-9-_]` (defeating CRLF/log injection
 * and header smuggling) and truncates to {@link MAX_REQUEST_ID_LENGTH}. When the
 * input contains no usable characters, a fresh UUID v4 is minted instead so the
 * result is always a non-empty, well-formed ID.
 *
 * @param raw - The untrusted inbound value (e.g. `x-request-id`).
 * @returns A branded, log-safe request ID.
 */
export function sanitizeRequestId(raw: string): RequestId {
	const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, MAX_REQUEST_ID_LENGTH);
	if (cleaned.length === 0) {
		return unsafeBrand<"RequestId", string>(crypto.randomUUID());
	}
	return unsafeBrand<"RequestId", string>(cleaned);
}

/**
 * Resolve the request ID for an inbound request — sanitizing any caller-supplied
 * value via {@link sanitizeRequestId}, otherwise minting a fresh UUID v4 via
 * `crypto.randomUUID()`.
 *
 * Use as the source of truth for the per-request correlation ID written into log
 * lines, response headers (`x-request-id`), and downstream service hops.
 * Trusting an upstream-supplied ID lets distributed traces follow the request
 * across service boundaries — but the raw value is untrusted, so it is passed
 * through {@link sanitizeRequestId} (safe charset + length bound) before use.
 *
 * @param existingId - Inbound `x-request-id` (or equivalent), if any. Sanitized
 *   (not echoed verbatim) when truthy; unsafe characters are stripped so the
 *   value cannot inject CRLF into logs or smuggle response headers.
 *
 * @returns A branded {@link RequestId}: the sanitized inbound value, or a freshly
 *   generated UUID v4.
 *
 * @example
 * ```ts
 * const requestId = getRequestId(req.headers["x-request-id"]);
 * res.headers.set("x-request-id", requestId);
 * logger.info("incoming request", { requestId, path: req.url });
 * ```
 */
export function getRequestId(existingId?: string): RequestId {
	return existingId
		? sanitizeRequestId(existingId)
		: unsafeBrand<"RequestId", string>(crypto.randomUUID());
}
