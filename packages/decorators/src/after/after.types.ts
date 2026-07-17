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
 * @fileoverview Types for the `@after` decorator — the hook signature
 * (`AfterFunc`), its configuration (`AfterConfig`), and the payload the hook
 * receives (`AfterParams`).
 *
 * @module @resq-systems/decorators/after/after.types
 */

/**
 * Function signature for after hooks.
 *
 * The payload is **optional** so a hook that ignores the call context can be a
 * zero-arg function. The declared return is `void` and the hook's return value
 * is ignored unless {@link AfterConfig.wait} is set — in which case a returned
 * promise is awaited before the decorated method resolves.
 *
 * @template D - The decorated method's resolved return type, surfaced as
 *   {@link AfterParams.response}.
 * @param x - Parameters containing the call arguments and the response.
 * @example
 * ```typescript
 * const afterHook: AfterFunc<string> = ({ args, response }) => {
 *   console.log(`Method returned: ${response}`);
 * };
 * ```
 */
export type AfterFunc<D> = (x?: AfterParams<D>) => void;

/**
 * Configuration options for the `@after` decorator.
 *
 * {@link func} is a two-way choice resolved at call time: an inline
 * {@link AfterFunc} is invoked directly, whereas a `keyof T` string names a
 * method looked up on the instance (`this`) each call — if that name does not
 * resolve to a callable, the wrapped call rejects. When `func` is a method name,
 * the class must actually be the receiver, since the lookup is against `this`.
 *
 * @template T - The class owning the decorated method; constrains the `keyof T`
 *   method names accepted by {@link func}.
 * @template D - The decorated method's resolved return type, forwarded to the
 *   hook as {@link AfterParams.response}.
 * @example
 * ```typescript
 * // Using a function reference
 * const config1: AfterConfig<MyClass, string> = {
 *   func: ({ args, response }) => console.log(response),
 *   wait: false
 * };

 * // Using a method name
 * const config2: AfterConfig<MyClass, string> = {
 *   func: 'logResult', // Calls this.logResult()
 *   wait: true
 * };
 * ```
 */
export interface AfterConfig<T = unknown, D = unknown> {
	/** The after function to execute, or the name of a method on the instance. */
	func: AfterFunc<D> | keyof T;
	/**
	 * When `true`, the wrapper awaits the hook (and any promise it returns) before
	 * resolving to the method's value; when `false` or absent (the default), the
	 * hook is fired without awaiting, so its rejection goes unobserved.
	 */
	wait?: boolean;
}

/**
 * Parameters passed to the after hook function.
 *
 * @template D - The return type of the decorated method.
 * @example
 * ```typescript
 * const params: AfterParams<number> = {
 *   args: ['input', 42],
 *   response: 100
 * };
 * ```
 */
export interface AfterParams<D = unknown> {
	/** The exact positional arguments the decorated method was called with. */
	args: unknown[];
	/**
	 * The method's **resolved** return value (`Awaited<D>`) — for an async method
	 * the fulfilled value, not the pending promise. The hook only runs on success,
	 * so this is never a rejection.
	 */
	response: D;
}
