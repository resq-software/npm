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
 * @fileoverview Compile-time exhaustiveness helper — {@link assertNever} forces
 * TypeScript to flag any unhandled union case in a `switch` default arm.
 *
 * @module @resq-systems/logger/_assert
 */

/**
 * Compile-time exhaustiveness guard. Placing a call in the `default` arm of a
 * `switch` over a finite union makes TypeScript error if a case is ever left
 * unhandled, keeping the mapping in sync with the union it switches over.
 *
 * If reached at runtime, it throws — signalling an unhandled value slipped past
 * the type system.
 *
 * @param value - The value that should have been narrowed to `never`.
 * @throws {Error} Always, when invoked at runtime.
 */
export function assertNever(value: never): never {
	throw new Error(`Unhandled case: ${String(value)}`);
}
