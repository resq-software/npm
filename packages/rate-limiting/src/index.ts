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
 * @fileoverview Public API for `@resq-systems/rate-limiting` — throttle and debounce
 * utilities, in-memory rate-limit algorithms (token bucket, leaky bucket,
 * sliding window), and HTTP middleware adapters.
 *
 * Optional peer dependencies:
 * - `effect` — for Effect-based rate-limit Layers
 * - `@upstash/redis` + `@upstash/ratelimit` — for distributed rate-limit stores
 *
 * @module @resq-systems/rate-limiting
 *
 * @example Throttle
 * ```ts
 * import { throttle } from "@resq-systems/rate-limiting";
 *
 * const onScroll = throttle(handleScroll, 100); // max 1 call / 100ms
 * window.addEventListener("scroll", onScroll);
 * ```
 *
 * @example Token bucket
 * ```ts
 * import { TokenBucket } from "@resq-systems/rate-limiting";
 *
 * const bucket = new TokenBucket({ capacity: 10, refillRate: 1 }); // 1 token/sec
 * if (bucket.tryConsume()) { ... }
 * ```
 */

export * from "./decision.js";
export * from "./throttle.js";
export * from "./rate-limit.js";
