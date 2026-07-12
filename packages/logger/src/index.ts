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
 * @fileoverview Public API for `@resq-systems/logger` — structured logging with
 * log levels, context, timing, and class/method decorators for Node.js and Bun.
 *
 * **Zero runtime dependencies.**
 *
 * @module @resq-systems/logger
 *
 * @example Singleton usage
 * ```ts
 * import { logger } from "@resq-systems/logger";
 *
 * logger.info("server started", { port: 3000 });
 * logger.error("db query failed", { query, error });
 * ```
 *
 * @example Decorators
 * ```ts
 * import { logTiming, logErrors } from "@resq-systems/logger";
 *
 * class UserService {
 *   @logTiming()
 *   @logErrors()
 *   async findById(id: string) { ... }
 * }
 * ```
 */

export * from "./logger.js";
export type * from "./logger.types.js";
export * from "./logger.decorators.js";
