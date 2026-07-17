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
 * @fileoverview `@readonly` method decorator — marks the decorated method's
 * property descriptor non-writable so it cannot be reassigned on instances.
 *
 * @module @resq-systems/decorators/readonly/readonly
 */

import type { Readonlyable } from "./index.js";

/**
 * Mark a method read-only by setting its property descriptor's `writable` flag to
 * `false`, so it cannot be reassigned after the class is instantiated.
 *
 * @template T - The class type that owns the decorated method.
 * @returns The method decorator.
 * @example
 * ```ts
 * class SecureApi {
 *   @readonly()
 *   authenticate(): Promise<AuthToken> {
 *     return this.performAuth();
 *   }
 *
 *   @readonly()
 *   getBaseUrl(): string {
 *     return 'https://api.example.com';
 *   }
 * }
 *
 * const api = new SecureApi();
 *
 * // These will throw TypeError
 * // api.authenticate = () => Promise.resolve(fakeToken);
 * // api.getBaseUrl = () => 'https://evil.com';
 *
 * // Calling the methods works normally
 * const token = await api.authenticate();
 * const url = api.getBaseUrl();
 * ```
 */
export function readonly<T = unknown>(): Readonlyable<T> {
	return <F extends (...args: never[]) => unknown>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => ({ ...descriptor, writable: false });
}
