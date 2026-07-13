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
import { type PositiveInt, toPositiveInt } from "@resq-systems/types";

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
					{ error: "Too many requests", retryAfterMs: result.resetAt - Date.now() },
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
		// @resq-systems/types: validate the optional length into a branded
		// `PositiveInt` at the boundary so `generateSecureToken` can only ever be
		// called with a proven-positive integer.
		if (url.pathname === "/api/token" && req.method === "GET") {
			const bytesParam = url.searchParams.get("bytes");
			let length: PositiveInt | undefined;
			if (bytesParam !== null) {
				const n = Number(bytesParam);
				if (!Number.isInteger(n) || n <= 0) {
					return Response.json(
						{ error: "bytes must be a positive integer" },
						{ status: 400, headers: { "x-request-id": requestId } },
					);
				}
				length = toPositiveInt(n);
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
				const body = await req.json();
				const sanitized = sanitizeForLogging(body as Record<string, unknown>);
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
