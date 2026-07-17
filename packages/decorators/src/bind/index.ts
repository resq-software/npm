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
 * @fileoverview `@bind` decorator barrel — auto-bind class methods to their
 * instance so detached callbacks keep the correct `this`. Also re-exports
 * `BindConfig`.
 *
 * @module @resq-systems/decorators/bind
 *
 * @example
 * ```typescript
 * import { bind } from "@resq-systems/decorators";
 *
 * class Component {
 *   @bind
 *   handleClick(): void {
 *     // `this` is correctly bound.
 *   }
 * }
 * ```
 */

export * from "./bind.js";
export * from "./bind.types.js";
