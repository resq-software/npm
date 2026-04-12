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
 * @fileoverview Main decorators module exports.
 * Re-exports all decorator modules for convenient importing.
 *
 * @module @resq/typescript/decorators
 *
 * @example
 * ```typescript
 * import { memoize, throttle, bind } from '@resq/typescript/decorators';
 *
 * class MyClass {
 *   @memoize()
 *   compute(n: number): number {
 *     return n * n;
 *   }
 *
 *   @throttle(100)
 *   handleScroll(): void {
 *     // Handle scroll event
 *   }
 *
 *   @bind
 *   handleClick(): void {
 *     // Handle click event
 *   }
 * }
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

export * from './after/index.js';
export * from './before/index.js';
export * from './bind/index.js';
export * from './debounce/index.js';
export * from './delay/index.js';
export * from './delegate/index.js';
export * from './exec-time/index.js';
export * from './execute/index.js';
export * from './memoize/index.js';
export * from './memoize-async/index.js';
export * from './observer/index.js';
export * from './rate-limit/index.js';
export * from './readonly/index.js';
export * from './throttle/index.js';
export * from './throttle-async/index.js';
export * from './types.js';
