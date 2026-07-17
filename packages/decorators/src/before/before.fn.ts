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
 * @fileoverview Function form of `@before` — `beforeFn(method, config)` wraps a
 * plain method so a pre-hook runs before each call, optionally awaited when
 * `config.wait` is set.
 *
 * @module @resq-systems/decorators/before/before.fn
 */

import { isFunction } from "../_utils.js";
import type { Method } from "../types.js";
import type { BeforeConfig } from "./before.types.js";

/**
 * Wraps a method to execute a before-hook function before the method runs.
 *
 * The wrapper is **always async** (returns a `Promise<D>` even for a synchronous
 * `originalMethod`). With `config.wait`, the hook is awaited first: if it throws
 * or rejects, the returned promise rejects and `originalMethod` is never called
 * (guard semantics). Without `wait`, the hook is invoked but not awaited — its
 * return is ignored and the method runs regardless. Each call is independent
 * (no shared state); there is no `AbortSignal` support.
 *
 * @template T - The type owning the named hook when `config.func` is a method name.
 * @template D - The return type of the original method.
 * @template A - The argument types of the original method.
 * @param originalMethod - The method to wrap.
 * @param config - Configuration for the before hook.
 * @returns The wrapped method.
 * @throws {Error} As a rejected promise, when `config.func` is a method name
 *   that does not resolve to a callable on the invocation's `this`.
 * @example
 * ```typescript
 * class Service {
 *   process(data: string): string {
 *     return data.toUpperCase();
 *   }
 * }
 *
 * const service = new Service();
 * const wrapped = beforeFn(
 *   service.process.bind(service),
 *   {
 *     func: () => {
 *       console.log('About to process...');
 *     },
 *     wait: false
 *   }
 * );
 *
 * await wrapped('hello'); // Logs "About to process..." then returns "HELLO"
 * ```
 */
export function beforeFn<T = unknown, D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	config: BeforeConfig<T>,
): Method<Promise<D>, A> {
	const resolvedConfig: BeforeConfig<T> = {
		wait: false,
		...config,
	};

	return async function (this: unknown, ...args: A): Promise<D> {
		const { func } = resolvedConfig;
		let beforeFunc: (...hookArgs: unknown[]) => unknown;

		if (isFunction(func)) {
			beforeFunc = func;
		} else {
			// `func` is a method name (`keyof T`); resolve it against the instance
			// via a narrow `Record` view instead of an `any`-typed `this`.
			const named = (this as Record<PropertyKey, unknown>)[func];
			if (!isFunction(named)) {
				throw new Error(`@before: "${String(func)}" is not a method on the instance`);
			}
			beforeFunc = named.bind(this);
		}

		if (resolvedConfig.wait) {
			await beforeFunc();
			return originalMethod.apply(this, args);
		}

		beforeFunc();
		return originalMethod.apply(this, args);
	};
}
