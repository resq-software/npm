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
 * @fileoverview `@memoize(configOrTTL?)` decorator and `memoizeFn`
 * function form — cache **synchronous** method results keyed by
 * arguments. Accepts a TTL number, a full `MemoizeConfig` (custom
 * cache, key resolver, expiry), or no args for cache-forever. Use
 * {@link memoizeAsync} for promise-returning methods.
 *
 * @module @resq-systems/decorators/memoize
 */

export * from "./memoize.js";
export * from "./memoize.types.js";
