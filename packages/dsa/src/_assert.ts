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
 * @fileoverview Local, zero-dependency exhaustiveness guard for `switch` default
 * arms and other spots that must never be reached at the type level.
 *
 * @module @resq-systems/dsa/_assert
 */

/**
 * Asserts that a code path is unreachable. Placing this in a `switch` default
 * arm makes the compiler reject the switch if any union member is left
 * unhandled, because a non-`never` value cannot be passed here.
 *
 * @param value - The value the type system has narrowed to `never`.
 * @throws Always throws at runtime if somehow reached (e.g. untyped input).
 */
export function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`);
}
