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
 * @fileoverview `@rateLimit(config)` decorator and `rateLimitFn`
 * function form — cap method calls to `allowedCalls` per
 * `timeSpanMs`. Configurable `keyResolver` for per-user/per-route
 * limiting and an `exceedHandler` for the rejection path. Ships
 * with a default `SimpleRateLimitCounter`; supply a custom counter
 * via the `rateLimitCounter` option for distributed / Redis-backed
 * limiting.
 *
 * @module @resq-systems/decorators/rate-limit
 */

export { rateLimit } from "./rate-limit.js";
export type {
	RateLimitable,
	RateLimitAsyncCounter,
	RateLimitConfigs,
	RateLimitCounter,
} from "./rate-limit.types.js";
export { SimpleRateLimitCounter } from "./simple-rate-limit-counter.js";
