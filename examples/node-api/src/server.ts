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
 * Example Bun HTTP API server using @resq-systems packages.
 *
 * Demonstrates: structured logging, rate limiting, input sanitization,
 * secure token generation, request ID tracking, method-level memoization
 * (@resq-systems/decorators), and branded input validation (@resq-systems/types).
 */

import { memoize } from "@resq-systems/decorators";
import { getRequestId, shouldRedirectToHttps } from "@resq-systems/http";
import { Logger } from "@resq-systems/logger";
import { MemoryRateLimitStore } from "@resq-systems/rate-limiting";
import { generateSecureToken, sanitizeForLogging } from "@resq-systems/security";
import { isPositiveInt } from "@resq-systems/types";
import { isPlainObject } from "@resq-systems/types/guards";
import { tryNarrow } from "@resq-systems/types/narrow";

const log = new Logger("api-server");
const rateLimiter = new MemoryRateLimitStore();

// Rate limit config: 10 requests per 60-second window
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

// @resq-systems/decorators — `@memoize()` caches the first return value, so the
// snapshot is computed once and reused on every /api/stats hit (`computeCount`
// stays 1) until the process restarts. Swap in `@memoize(5_000)` to expire the
// cache after 5s.
class StatsService {
	private computeCount = 0;

	@memoize()
	snapshot(): { startedAt: number; computeCount: number } {
		this.computeCount += 1;
		return { startedAt: Date.now(), computeCount: this.computeCount };
	}
}
const stats = new StatsService();

const server = Bun.serve({
	port: 3000,

	async fetch(req) {
		const url = new URL(req.url);
		const requestId = getRequestId(req.headers.get("x-request-id") ?? undefined);

		// Check if we should redirect to HTTPS (skipped in development)
		const headers: Record<string, string | undefined> = {
			"x-forwarded-proto": req.headers.get("x-forwarded-proto") ?? undefined,
			"x-forwarded-ssl": req.headers.get("x-forwarded-ssl") ?? undefined,
		};
		const httpsRedirect = shouldRedirectToHttps(url.protocol, req.url, headers);
		if (httpsRedirect) {
			// Validate redirect stays on the same host to prevent open-redirect attacks
			const redirectUrl = new URL(httpsRedirect);
			if (redirectUrl.hostname === url.hostname) {
				return Response.redirect(httpsRedirect, 301);
			}
		}

		log.info(`${req.method} ${url.pathname}`, { requestId });

		// --- Rate limit /api routes ---
		if (url.pathname.startsWith("/api")) {
			const clientIp = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
			const result = await rateLimiter.check(clientIp, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX);

			if (!result.allowed) {
				log.warn("Rate limited", { requestId, clientIp });
				return Response.json(
					{ error: "Too many requests", retryAfterMs: Math.max(0, result.resetAt - Date.now()) },
					{ status: 429, headers: { "x-request-id": requestId } },
				);
			}
		}

		// --- Routes ---

		// GET /health — simple health check
		if (url.pathname === "/health" && req.method === "GET") {
			return Response.json(
				{ status: "ok", uptime: process.uptime() },
				{ headers: { "x-request-id": requestId } },
			);
		}

		// GET /api/token[?bytes=N] — generate a secure random token.
		// @resq-systems/types: `tryNarrow` runs the `isPositiveInt` guard and hands
		// back the branded value or `undefined`, so the check and the proof are one
		// step. Worth noting what the guard rejects that a hand-rolled `n > 0` does
		// not: `?bytes=abc` and `?bytes=` both make `Number()` produce NaN, and every
		// comparison against NaN is false — so `n <= 0` would wave them through.
		if (url.pathname === "/api/token" && req.method === "GET") {
			const bytesParam = url.searchParams.get("bytes");
			const length = bytesParam === null ? undefined : tryNarrow(Number(bytesParam), isPositiveInt);
			if (bytesParam !== null && length === undefined) {
				return Response.json(
					{ error: "bytes must be a positive integer" },
					{ status: 400, headers: { "x-request-id": requestId } },
				);
			}
			const token = length ? generateSecureToken(length) : generateSecureToken();
			log.info("Token generated", { requestId });
			return Response.json({ token }, { headers: { "x-request-id": requestId } });
		}

		// GET /api/stats — a @memoize'd snapshot; recomputed only on first call.
		if (url.pathname === "/api/stats" && req.method === "GET") {
			return Response.json(stats.snapshot(), { headers: { "x-request-id": requestId } });
		}

		// POST /api/echo — echo back sanitized input
		if (url.pathname === "/api/echo" && req.method === "POST") {
			try {
				// `req.json()` is typed `any`, so `body as Record<string, unknown>` used to
				// compile while being false for most of what a client can actually post:
				// `[1,2,3]`, `"hello"`, `42` and `null` all satisfy the cast and none of them
				// is a record. @resq-systems/types: `isPlainObject` proves it instead of
				// asserting it — rejecting arrays, primitives and class instances, while
				// still accepting an `Object.create(null)` dictionary, which is what a
				// JSON body deserialises to under some parsers and is a record in every
				// sense that matters here.
				const body: unknown = await req.json();
				if (!isPlainObject(body)) {
					return Response.json(
						{ error: "Body must be a JSON object" },
						{ status: 400, headers: { "x-request-id": requestId } },
					);
				}
				const sanitized = sanitizeForLogging(body);
				log.info("Echo request (sanitized)", { requestId, data: sanitized });
				return Response.json({ requestId, sanitized }, { headers: { "x-request-id": requestId } });
			} catch {
				return Response.json(
					{ error: "Invalid JSON body" },
					{ status: 400, headers: { "x-request-id": requestId } },
				);
			}
		}

		// Fallback — 404
		return Response.json(
			{ error: "Not found" },
			{ status: 404, headers: { "x-request-id": requestId } },
		);
	},
});

log.info(`Server listening on http://localhost:${server.port}`);
