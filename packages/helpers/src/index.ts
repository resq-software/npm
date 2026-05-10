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
 * @fileoverview Public API for `@resq-sw/helpers` — functional utilities,
 * type guards, Result types, code-path parsing, async task execution, and
 * formatting helpers.
 *
 * Subpath exports keep server-only and browser-only code separate:
 * - `@resq-sw/helpers` — universal utilities (Result, type guards, task exec)
 * - `@resq-sw/helpers/formatting` — date / number / string formatters
 * - `@resq-sw/helpers/browser` — DOM helpers, platform detection, html entities
 *
 * @module @resq-sw/helpers
 *
 * @example Result type
 * ```ts
 * import { catchError } from "@resq-sw/helpers";
 *
 * const result = await catchError(fetch, "/api/data");
 * if (result.success) console.log(result.value);
 * else console.error(result.error);
 * ```
 *
 * @example Type guards
 * ```ts
 * import { isString, isObject } from "@resq-sw/helpers";
 *
 * if (isString(input)) input.toUpperCase();
 * if (isObject(input)) Object.keys(input);
 * ```
 */

export * from "./helpers.js";
export * from "./parse-code-path.js";
export * from "./task-exec.js";
export type * from "./task-exec.types.js";
export * from "./formatting/index.js";
export * from "./browser/index.js";
