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
 * Example Bun HTTP API server using @resq-sw packages.
 *
 * Demonstrates: structured logging, rate limiting, input sanitization,
 * secure token generation, and request ID tracking.
 */

import { Logger } from "@resq-sw/logger";
import { MemoryRateLimitStore } from "@resq-sw/rate-limiting";
import { sanitizeForLogging, generateSecureToken } from "@resq-sw/security";
import { shouldRedirectToHttps, getRequestId } from "@resq-sw/http";

const log = new Logger("api-server");
const rateLimiter = new MemoryRateLimitStore();

// Rate limit config: 10 requests per 60-second window
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

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

      if (result.limited) {
        log.warn("Rate limited", { requestId, clientIp });
        return Response.json(
          { error: "Too many requests", retryAfterMs: result.resetTime - Date.now() },
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

    // GET /api/token — generate a secure random token
    if (url.pathname === "/api/token" && req.method === "GET") {
      const token = generateSecureToken(32);
      log.info("Token generated", { requestId });
      return Response.json(
        { token },
        { headers: { "x-request-id": requestId } },
      );
    }

    // POST /api/echo — echo back sanitized input
    if (url.pathname === "/api/echo" && req.method === "POST") {
      try {
        const body = await req.json();
        const sanitized = sanitizeForLogging(body as Record<string, unknown>);
        log.info("Echo request (sanitized)", { requestId, data: sanitized });
        return Response.json(
          { requestId, sanitized },
          { headers: { "x-request-id": requestId } },
        );
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
