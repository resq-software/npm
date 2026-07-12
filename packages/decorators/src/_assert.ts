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
 * Exhaustiveness guard for discriminated unions.
 *
 * Call this in the `default` branch of a `switch` over a union's discriminant.
 * If every variant is handled, `x` narrows to `never` and this type-checks; if a
 * variant is added later without a matching case, the call becomes a compile error.
 *
 * @param x - The value that should be of type `never` once all cases are handled
 * @throws {Error} Always, if reached at runtime with an unexpected value
 *
 * @example
 * ```typescript
 * switch (mode.kind) {
 *   case "sync":
 *     return handleSync(mode);
 *   case "async":
 *     return handleAsync(mode);
 *   default:
 *     return assertNever(mode);
 * }
 * ```
 */
export function assertNever(x: never): never {
	throw new Error(`Unexpected value: ${String(x)}`);
}
