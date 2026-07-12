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
 * @fileoverview Public API for `@resq-systems/http` — Effect-based HTTP client with
 * retry, timeout, and schema validation.
 *
 * Subpath exports:
 * - `@resq-systems/http` — fetcher, retry, timeout, JSON helpers
 * - `@resq-systems/http/security` — HTTPS redirect helper, request-ID extraction
 *
 * Requires `effect` (v4) as a peer dependency — the HTTP client lives in core at
 * `effect/unstable/http`. `@effect/platform` is NOT required: it never shipped a
 * v4, and its v3 line imports `effect/Either` and `effect/FiberRef`, which v4
 * removed. `@effect/platform-bun` is an optional peer for `BunHttpClient.layer`
 * when running on Bun; `FetchHttpClient.layer` from core works everywhere else.
 *
 * @module @resq-systems/http
 *
 * @example
 * ```ts
 * import { get, post } from "@resq-systems/http";
 * import { Effect } from "effect";
 *
 * const program = Effect.gen(function* () {
 *   const users = yield* get<User[]>("/api/users");
 *   return users;
 * });
 * ```
 */

export * from "./fetcher.js";
export { shouldRedirectToHttps, getRequestId } from "./security.js";
