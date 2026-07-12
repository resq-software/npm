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
 * @file Rate Limit Decision
 * @module @resq-systems/rate-limiting/decision
 * @description The single, canonical shape every rate-limit check returns.
 *              Both the store layer ({@link IRateLimitStore.check}) and the
 *              in-process {@link SlidingWindowCounter.check} resolve to this
 *              discriminated union so callers branch on one consistent field.
 */

import { Schema as S } from "effect";

/**
 * Effect Schema for a {@link RateLimitDecision}. A discriminated union keyed
 * on `allowed`: a permitted request carries the requests still available,
 * while a rejected request pins `remaining` to `0`. Useful when serialising
 * decisions to inter-service queues or persisting them for audit.
 *
 * @example
 * ```ts
 * import { Schema } from "effect";
 * const decision = Schema.decodeUnknownSync(RateLimitDecisionSchema)(input);
 * if (decision.allowed) { ... } // narrowed to the permitted variant
 * ```
 */
export const RateLimitDecisionSchema = S.Union([
	S.Struct({
		/** Discriminant: the request is permitted. */
		allowed: S.Literal(true),
		/** Requests remaining in the current window (clamped at `0`). */
		remaining: S.Number,
		/** Configured `maxRequests` for the window (echoed for header generation). */
		limit: S.Number,
		/** Unix epoch ms when the current window resets and counters drop. */
		resetAt: S.Number,
	}),
	S.Struct({
		/** Discriminant: the request is rejected. */
		allowed: S.Literal(false),
		/** Always `0` — a rejected request has nothing left in the window. */
		remaining: S.Literal(0),
		/** Configured `maxRequests` for the window (echoed for header generation). */
		limit: S.Number,
		/** Unix epoch ms when the current window resets and counters drop. */
		resetAt: S.Number,
	}),
]);

/**
 * The outcome of a rate-limit check.
 *
 * A discriminated union on `allowed`:
 * - `{ allowed: true, remaining, limit, resetAt }` — under the limit; the
 *   request was counted.
 * - `{ allowed: false, remaining: 0, limit, resetAt }` — over the limit; the
 *   request was **not** counted.
 *
 * Callers narrow with a single check:
 *
 * @example
 * ```ts
 * const decision = await store.check("user:42", 60_000, 100);
 * if (!decision.allowed) {
 *   return new Response("Too many requests", {
 *     status: 429,
 *     headers: { "RateLimit-Reset": String(decision.resetAt) },
 *   });
 * }
 * ```
 */
export type RateLimitDecision = typeof RateLimitDecisionSchema.Type;
