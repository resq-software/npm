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
 * @fileoverview Type for the `@before` decorator — `BeforeConfig` describes the
 * pre-hook to run and whether the decorated method waits for it.
 *
 * @module @resq-systems/decorators/before/before.types
 */

/**
 * Configuration options for the `@before` decorator.
 *
 * {@link func} is resolved at call time: an inline function is invoked directly,
 * whereas a `keyof T` string names a method looked up on the instance (`this`)
 * each call — if it does not resolve to a callable, the wrapped call rejects.
 * With {@link wait} set, a throwing hook aborts the method (guard pattern),
 * making the two fields interdependent rather than orthogonal.
 *
 * @template T - The class owning the decorated method; constrains the `keyof T`
 *   method names accepted by {@link func}.
 * @example
 * ```typescript
 * // Using a function reference
 * const config1: BeforeConfig<MyClass> = {
 *   func: () => console.log('Before method'),
 *   wait: false
 * };

 * // Using a method name
 * const config2: BeforeConfig<MyClass> = {
 *   func: 'validate',
 *   wait: true
 * };
 * ```
 */
export interface BeforeConfig<T> {
	/** The before function to execute, or the name of a method on the instance. */
	func: ((...args: unknown[]) => unknown) | keyof T;
	/**
	 * When `true`, the wrapper awaits the hook before running the method, so a
	 * hook that throws or rejects prevents the method from running (a guard).
	 * When `false` or absent (the default), the hook is fired without awaiting and
	 * the method runs regardless of the hook's outcome.
	 */
	wait?: boolean;
}
