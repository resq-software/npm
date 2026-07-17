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
 * @fileoverview Function form of `@after` — `afterFn(method, config)` wraps a
 * plain method so an after-hook runs once the method settles, awaiting the hook
 * only when `config.wait` is set.
 *
 * @module @resq-systems/decorators/after/after.fn
 */

import { isFunction } from "../_utils.js";
import type { Method } from "../types.js";
import type { AfterConfig, AfterFunc } from "./after.types.js";

/**
 * Wraps a method to execute an after-hook function once the method completes.
 *
 * The wrapper is **always async**: it returns a `Promise` even when
 * `originalMethod` is synchronous, because it awaits the result so the hook
 * receives the resolved value. The hook runs only on success — if
 * `originalMethod` throws or rejects, the returned promise rejects with that
 * error and the hook is skipped. Each call is independent (no shared state), so
 * concurrent invocations are safe; there is no `AbortSignal` support.
 *
 * @template T - The type owning the named hook when `config.func` is a method name.
 * @template D - The return type of the original method.
 * @template A - The argument types of the original method.
 * @param originalMethod - The method to wrap.
 * @param config - Configuration for the after hook.
 * @returns The wrapped method, which resolves to the original method's value.
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
 * const wrapped = afterFn(
 *   service.process.bind(service),
 *   {
 *     func: ({ args, response }) => {
 *       console.log(`Called with ${args[0]}, returned ${response}`);
 *     },
 *     wait: false
 *   }
 * );
 *
 * await wrapped('hello'); // Logs: Called with hello, returned HELLO
 * ```
 */
export function afterFn<T = unknown, D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	config: AfterConfig<T, Awaited<D>>,
): (...args: A) => Promise<Awaited<D>> {
	const resolvedConfig: AfterConfig<T, Awaited<D>> = {
		wait: false,
		...config,
	};

	return async function (this: unknown, ...args: A): Promise<Awaited<D>> {
		const { func } = resolvedConfig;
		let afterFunc: AfterFunc<Awaited<D>>;

		if (isFunction(func)) {
			afterFunc = func;
		} else {
			// `func` is a method name (`keyof T`); resolve it against the instance
			// via a narrow `Record` view instead of an `any`-typed `this`.
			const named = (this as Record<PropertyKey, unknown>)[func];
			if (!isFunction(named)) {
				throw new Error(`@after: "${String(func)}" is not a method on the instance`);
			}
			afterFunc = named.bind(this) as AfterFunc<Awaited<D>>;
		}

		// Always await the original result so the hook receives the resolved
		// value (`Awaited<D>`) rather than an unsettled promise for async methods.
		const response = await originalMethod.apply(this, args);
		const hookResult = afterFunc({ args, response });

		if (resolvedConfig.wait) {
			await hookResult;
		}

		return response;
	};
}
