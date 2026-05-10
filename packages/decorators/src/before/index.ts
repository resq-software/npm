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
 * @fileoverview `@before` decorator — run a callback before the
 * decorated method runs. The pre-callback can be `await`-ed via
 * `wait: true` for state-validation or guard patterns. Companion
 * `beforeFn(method, config)` wraps a plain function with the same
 * semantics.
 */

export * from "./before.js";
export * from "./before.types.js";
