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
 * @fileoverview Compile-time exhaustiveness enforcement.
 *
 * A `switch` (or `if`/`else` chain) over a discriminated union should handle
 * every case. {@link assertNever} turns "someone added a new union member and
 * forgot to handle it" from a silent runtime fall-through into a **compile
 * error** at the default arm — the single most valuable line you can add to a
 * decision function that routes on a threat category, a message kind, or a
 * protocol tag.
 */

/**
 * Assert that a code path is unreachable. Placed in the `default` arm of an
 * exhaustive `switch`, the `value: never` parameter fails to type-check the
 * moment the union it discriminates gains a member that isn't handled above —
 * so adding a case to the union without adding a branch is a build error, not a
 * production surprise. At runtime (should it ever be reached via an untyped
 * caller) it throws.
 *
 * @param value - The value that should have been narrowed to `never`.
 * @param message - Optional override for the thrown error message.
 * @returns Never returns — always throws.
 * @throws {Error} Always, when actually invoked at runtime.
 *
 * @example
 * ```ts
 * type ThreatType = "xss" | "sql_injection" | "path_traversal";
 *
 * function message(t: ThreatType): string {
 *   switch (t) {
 *     case "xss": return "script content";
 *     case "sql_injection": return "database commands";
 *     case "path_traversal": return "file path characters";
 *     default: return assertNever(t); // ✗ compile error if a ThreatType is added
 *   }
 * }
 * ```
 */
export function assertNever(value: never, message?: string): never {
	throw new Error(message ?? `Unreachable: unexpected value ${String(value)}`);
}

/**
 * Alias of {@link assertNever} for teams that prefer the "unreachable"
 * vocabulary at the call site. Identical behavior.
 */
export const assertUnreachable: (value: never, message?: string) => never = assertNever;
