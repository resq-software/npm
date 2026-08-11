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
 * @fileoverview Signed CSRF tokens — the control for WSTG-SESS-05.
 *
 * A forged cross-site request is byte-identical to a genuine one; that identity *is*
 * the weakness, which is why no signature in the threat catalog can detect it. The
 * defence is to require a value the attacker's page can neither read nor predict.
 *
 * This implements the **signed double-submit** pattern: the token carries its own
 * HMAC, so verification needs the server secret and no per-session storage. Bind it to
 * a session with `sessionId` whenever one exists — an unbound token verifies for any
 * user, which still stops a plain cross-site forgery but not a logged-in attacker
 * minting a token and planting it on a victim.
 *
 * **This is one layer.** Also ship `SameSite=Lax` (or `Strict`) on session cookies and
 * validate `Origin` with `isAllowedOrigin` on state-changing requests. Each of the
 * three can be bypassed alone.
 *
 * @module @resq-systems/security/controls/csrf
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

//#region Constants

/** Bytes of randomness in the token nonce — 128 bits. */
const NONCE_BYTES = 16;

/** Default token lifetime: two hours. */
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

/** Field separator. Outside the base64url alphabet, so it cannot occur within a field. */
const SEPARATOR = ".";

/** Radix for the expiry field, chosen to keep the token short. */
const TIMESTAMP_RADIX = 36;

/** Fixed key for the length-blinding digest in {@link constantTimeEquals}. */
const BLINDING_KEY = "resq-csrf-length-blind";

//#endregion

//#region Token minting

/** Options for {@link createCsrfToken}. */
export interface CsrfTokenOptions {
	/**
	 * Session identifier to bind the token to. Strongly recommended: without it, a
	 * token minted by any user verifies for every other user.
	 */
	readonly sessionId?: string;
	/** Lifetime in milliseconds. Defaults to two hours. */
	readonly ttlMs?: number;
}

/**
 * Whether a string is well-formed UTF-16 — no unpaired surrogate.
 *
 * This matters because `createHmac().update(string)` encodes as UTF-8, which maps
 * *every* lone surrogate to the same replacement bytes `EF BF BD`, while
 * `String.length` counts UTF-16 code units. The length prefix therefore stops being
 * injective for ill-formed input: `"tenant-\uD800"` and `"tenant-�"` hash
 * identically, and a token bound to one verifies for the other.
 *
 * Implemented by scanning rather than calling `String.prototype.isWellFormed`, so the
 * check does not depend on the ES2024 lib being configured.
 */
function isWellFormedUtf16(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		// Not a surrogate — always fine.
		if (code < 0xd800 || code > 0xdfff) continue;
		// A trailing surrogate here means it had no leading partner.
		if (code >= 0xdc00) return false;
		// A leading surrogate must be followed by a trailing one.
		const next = value.charCodeAt(i + 1);
		if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return false;
		i++;
	}
	return true;
}

/** A session identifier usable for binding: a well-formed string. */
function isBindableSessionId(value: unknown): value is string {
	return typeof value === "string" && isWellFormedUtf16(value);
}

/**
 * Compute the token signature over the nonce, expiry, and bound session.
 *
 * Each field is length-prefixed before hashing. Without that, a different
 * (nonce, expiry, sessionId) split could produce the same concatenated input — so a
 * token bound to session `"ab"` would verify against session `"a"` with a shifted
 * nonce.
 *
 * Callers must pass a well-formed string; see {@link isBindableSessionId}. Both
 * entry points enforce it, because template-stringifying a non-string collapses every
 * object to `"[object Object]"` and every such session to the *same* signature.
 */
function sign(secret: string, nonce: string, expiry: string, sessionId: string): string {
	return createHmac("sha256", secret)
		.update(`${nonce.length}:${nonce}|${expiry.length}:${expiry}|${sessionId.length}:${sessionId}`)
		.digest("base64url");
}

/**
 * Mint a signed CSRF token.
 *
 * Send it to the client in a readable cookie *and* require it back in a header or form
 * field. A cross-origin page can cause the cookie to be sent but cannot read it, so it
 * cannot populate the second copy.
 *
 * @param secret - Server-side signing secret. Must be non-empty; use at least 32 bytes
 *   of entropy from a secret manager, and never a value shipped to the client.
 * @param options - See {@link CsrfTokenOptions}.
 * @returns An opaque token safe to place in a cookie, header, or hidden form field.
 * @throws {TypeError} If `secret` is empty, if `sessionId` is present but is not a
 *   well-formed string, or if `ttlMs` is not a positive integer. Each of the three is
 *   a programming error that would otherwise weaken the token silently — a non-string
 *   `sessionId` binds every session to the same signature, and a fractional `ttlMs`
 *   injects the field separator into the expiry.
 *
 * @example
 * ```ts
 * const token = createCsrfToken(process.env.CSRF_SECRET!, { sessionId: session.id });
 * res.setHeader("Set-Cookie", `csrf=${token}; Path=/; SameSite=Lax`);
 * ```
 */
export function createCsrfToken(secret: string, options: CsrfTokenOptions = {}): string {
	if (typeof secret !== "string" || secret.length === 0) {
		throw new TypeError("createCsrfToken: secret must be a non-empty string");
	}

	const { sessionId = "", ttlMs = DEFAULT_TTL_MS } = options;

	// Guarded after the destructuring default, so `undefined` still means "unbound"
	// while `null` and every non-string are refused with a clear message rather than a
	// cryptic `sessionId.length` failure. Without this, any object binds to the
	// constant "[object Object]" and one token verifies for every session.
	if (!isBindableSessionId(sessionId)) {
		throw new TypeError(
			"createCsrfToken: sessionId must be a well-formed string (no unpaired surrogates)",
		);
	}

	// Integer, not merely finite: a fractional value renders through
	// `Number.prototype.toString(36)` with a fractional tail, injecting the field
	// separator into the expiry and producing a token this module cannot parse back.
	if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
		throw new TypeError("createCsrfToken: ttlMs must be a positive integer number of milliseconds");
	}

	const nonce = randomBytes(NONCE_BYTES).toString("base64url");
	const expiry = (Date.now() + ttlMs).toString(TIMESTAMP_RADIX);

	return [nonce, expiry, sign(secret, nonce, expiry, sessionId)].join(SEPARATOR);
}

//#endregion

//#region Verification

/** Why a CSRF token was rejected. */
export type CsrfFailureReason =
	| "malformed"
	| "expired"
	| "signature_mismatch"
	| "missing_token"
	| "missing_secret";

/** Outcome of {@link verifyCsrfToken}. */
export type CsrfVerification =
	| { readonly valid: true }
	| { readonly valid: false; readonly reason: CsrfFailureReason };

/** Options for {@link verifyCsrfToken}. */
export interface CsrfVerifyOptions {
	/** Session the token must be bound to. Must match the value used at mint time. */
	readonly sessionId?: string;
}

/**
 * Constant-time comparison that does not leak length.
 *
 * `timingSafeEqual` throws when its arguments differ in length, and guarding that with
 * an early `length` check reintroduces a timing signal. Hashing both sides to a fixed
 * 32 bytes first makes the comparison both constant-time and length-blind.
 */
function constantTimeEquals(left: string, right: string): boolean {
	const digestLeft = createHmac("sha256", BLINDING_KEY).update(left, "utf8").digest();
	const digestRight = createHmac("sha256", BLINDING_KEY).update(right, "utf8").digest();
	return timingSafeEqual(digestLeft, digestRight);
}

/**
 * Verify a signed CSRF token.
 *
 * Checks the signature in constant time, then the expiry. The failure `reason` is for
 * server-side logging — do not return it to the client, since it distinguishes
 * "expired" from "forged" for anyone probing the endpoint.
 *
 * @param token - The token submitted with the request.
 * @param secret - The same signing secret used at mint time.
 * @param options - See {@link CsrfVerifyOptions}.
 * @returns `{ valid: true }`, or `{ valid: false, reason }`. Never throws.
 *
 * @example
 * ```ts
 * const result = verifyCsrfToken(req.headers["x-csrf-token"], secret, {
 *   sessionId: session.id,
 * });
 * if (!result.valid) {
 *   logger.warn("csrf rejected", { reason: result.reason });
 *   return new Response("Forbidden", { status: 403 });
 * }
 * ```
 */
export function verifyCsrfToken(
	token: string | undefined | null,
	secret: string,
	options: CsrfVerifyOptions = {},
): CsrfVerification {
	if (typeof secret !== "string" || secret.length === 0) {
		return { valid: false, reason: "missing_secret" };
	}
	if (typeof token !== "string" || token.length === 0) {
		return { valid: false, reason: "missing_token" };
	}

	const parts = token.split(SEPARATOR);
	if (parts.length !== 3) return { valid: false, reason: "malformed" };

	const [nonce, expiry, signature] = parts as [string, string, string];
	if (nonce.length === 0 || expiry.length === 0 || signature.length === 0) {
		return { valid: false, reason: "malformed" };
	}

	// `?? ""` first so null and undefined both keep meaning "unbound", then reject
	// anything that is not a well-formed string. Returning a verdict rather than
	// throwing, because this function's contract is that it never throws.
	const boundSession = options.sessionId ?? "";
	if (!isBindableSessionId(boundSession)) {
		return { valid: false, reason: "malformed" };
	}

	// Signature first, expiry second. Checking expiry first would let an attacker
	// distinguish a well-formed-but-stale token from a forged one by timing alone.
	const expected = sign(secret, nonce, expiry, boundSession);
	if (!constantTimeEquals(signature, expected)) {
		return { valid: false, reason: "signature_mismatch" };
	}

	const expiresAt = Number.parseInt(expiry, TIMESTAMP_RADIX);
	if (!Number.isFinite(expiresAt)) return { valid: false, reason: "malformed" };
	if (Date.now() > expiresAt) return { valid: false, reason: "expired" };

	return { valid: true };
}

//#endregion
