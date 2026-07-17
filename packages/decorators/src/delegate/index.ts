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
 * @fileoverview `@delegate(keyResolver?)` decorator and `delegateFn`
 * function form — deduplicate concurrent async calls. Calls that
 * map to the same key share a single in-flight promise, so a burst
 * of `getUser("42")` calls only hits the network once.
 *
 * @module @resq-systems/decorators/delegate
 */

export { delegate } from "./delegate.js";
export type { Delegatable } from "./delegate.types.js";
