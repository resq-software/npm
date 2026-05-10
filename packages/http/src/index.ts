/**
 * Copyright 2026 ResQ
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
 * @fileoverview Public API for `@resq-sw/http` — Effect-based HTTP client with
 * retry, timeout, and schema validation.
 *
 * Subpath exports:
 * - `@resq-sw/http` — fetcher, retry, timeout, JSON helpers
 * - `@resq-sw/http/security` — HTTPS redirect helper, request-ID extraction
 *
 * Requires `effect` and `@effect/platform` as peer dependencies.
 * `@effect/platform-bun` is an optional peer used when running on Bun.
 *
 * @module @resq-sw/http
 *
 * @example
 * ```ts
 * import { get, post } from "@resq-sw/http";
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
