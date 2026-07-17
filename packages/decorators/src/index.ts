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
 * @fileoverview Package barrel — re-exports every decorator (memoize, throttle,
 * bind, debounce, and friends) plus the shared `Method`/`Decorator` types so
 * consumers import from a single entry point.
 *
 * @module @resq-systems/decorators
 *
 * @example
 * ```typescript
 * import { memoize, throttle, bind } from "@resq-systems/decorators";
 *
 * class MyClass {
 *   @memoize()
 *   compute(n: number): number {
 *     return n * n;
 *   }
 *
 *   @throttle(100)
 *   handleScroll(): void {}
 *
 *   @bind
 *   handleClick(): void {}
 * }
 * ```
 */

export { after } from "./after/index.js";
export type { AfterConfig, AfterFunc, AfterParams } from "./after/index.js";
export { before } from "./before/index.js";
export type { BeforeConfig } from "./before/index.js";
export { bind } from "./bind/index.js";
export type { BindConfig } from "./bind/index.js";
export { debounceFn } from "./debounce/index.js";
export { delay } from "./delay/index.js";
export { delegate } from "./delegate/index.js";
export type { Delegatable } from "./delegate/index.js";
export { execTime, execTimeFn } from "./exec-time/index.js";
export type {
	ExactTimeReportable,
	ExactTimeReportData,
	ReportFunction,
} from "./exec-time/index.js";
export { selfExecute } from "./execute/index.js";
export { memoize } from "./memoize/index.js";
export type { Cache, KeyResolver, Memoizable, MemoizeConfig } from "./memoize/index.js";
export { memoizeAsync, memoizeAsyncFn } from "./memoize-async/index.js";
export type { AsyncCache, AsyncMemoizable, AsyncMemoizeConfig } from "./memoize-async/index.js";
export { observe } from "./observer/index.js";
export type { ObserverCallback } from "./observer/index.js";
export { rateLimit, SimpleRateLimitCounter } from "./rate-limit/index.js";
export type {
	RateLimitable,
	RateLimitAsyncCounter,
	RateLimitConfigs,
	RateLimitCounter,
} from "./rate-limit/index.js";
export { readonly } from "./readonly/index.js";
export type { Readonlyable } from "./readonly/index.js";
export { throttle } from "./throttle/index.js";
export { throttleAsync } from "./throttle-async/index.js";
export type { AsyncDecorator, AsyncMethod, Decorator, Method } from "./types.js";
