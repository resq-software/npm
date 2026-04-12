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

import type { Method } from '../types.js';
import type { Readonlyable } from './index.js';

/**
 * Decorator that makes a method read-only (non-writable).
 * Prevents the method from being reassigned after class instantiation.
 *
 * @template T - The type of the class containing the decorated method
 * @returns {Readonlyable<T>} The decorator function
 *
 * @example
 * ```typescript
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
export function readonly<T = any>(): Readonlyable<T> {
  return (
    target: T,
    key: keyof T,
    descriptor: TypedPropertyDescriptor<Method<any>>,
  ): TypedPropertyDescriptor<Method<any>> => {
    descriptor.writable = false;

    return descriptor;
  };
}
