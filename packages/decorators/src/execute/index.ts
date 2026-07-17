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
 * @fileoverview `@selfExecute` class decorator — auto-instantiate
 * the decorated class when its module loads. Useful for singletons
 * with side-effectful constructors (event listener registration,
 * runtime patching, telemetry init).
 *
 * @module @resq-systems/decorators/execute
 */

export * from "./execute.js";
