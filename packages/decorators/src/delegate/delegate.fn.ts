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
 * @fileoverview Function form of `@delegate` — `delegateFn(method, keyResolver?)`
 * wraps an async method so concurrent calls that map to the same key share a
 * single in-flight promise instead of issuing duplicate requests.
 *
 * @module @resq-systems/decorators/delegate/delegate.fn
 */

import type { AsyncMethod } from "../types.js";

/**
 * Wraps an async method to deduplicate concurrent calls.
 * Multiple calls with the same key will share the same promise
 * until the first one completes.
 *
 * Keeps a per-wrapper `Map` of in-flight promises keyed by `keyResolver` (or, by
 * default, `JSON.stringify(args)`). The entry is removed via `.finally` once the
 * promise **settles** — resolve *or* reject — so dedup only spans overlapping
 * in-flight calls; a call after settlement re-invokes the method. Concurrent
 * callers sharing a key share its fate: one rejection rejects them all. Distinct
 * keys never dedup. There is no `AbortSignal` support and no ordering guarantee
 * across keys.
 *
 * The key is computed **synchronously** before the method is called, so a
 * throwing key generator (the default `JSON.stringify` on a circular or `BigInt`
 * argument, or a custom `keyResolver` that throws) propagates as a synchronous
 * exception, not a rejected promise. Failures from `originalMethod` itself are
 * rejected promises.
 *
 * @template D - The resolved type of the promise.
 * @template A - The argument types of the original method.
 * @param originalMethod - The async method to wrap.
 * @param keyResolver - Optional function to generate cache keys from arguments.
 * @returns The delegated method that shares in-flight promises by key.
 * @throws {TypeError} Synchronously, when the default key generator cannot
 *   `JSON.stringify` the arguments (circular reference or `BigInt`).
 * @example
 * ```typescript
 * class Service {
 *   async fetchData(id: string): Promise<Data> {
 *     console.log(`Fetching ${id}`);
 *     return fetch(`/api/data/${id}`).then(r => r.json());
 *   }
 * }
 *
 * const service = new Service();
 * const delegated = delegateFn(
 *   service.fetchData.bind(service),
 *   (id) => id // Use id directly as key
 * );
 *
 * // These share the same promise - "Fetching 123" is logged only once
 * const p1 = delegated('123');
 * const p2 = delegated('123');
 * const [d1, d2] = await Promise.all([p1, p2]);
 * ```
 */
export function delegateFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: AsyncMethod<D, A>,
	keyResolver?: (...args: A) => string,
): AsyncMethod<D, A> {
	const delegatedKeysMap = new Map<string, Promise<D>>();
	const keyGenerator: (...args: unknown[]) => string =
		keyResolver ?? ((...args) => JSON.stringify(args));

	return function (this: unknown, ...args: A): Promise<D> {
		const key = keyGenerator(...args);

		if (!delegatedKeysMap.has(key)) {
			delegatedKeysMap.set(
				key,
				originalMethod.apply(this, args).finally(() => delegatedKeysMap.delete(key)),
			);
		}

		return delegatedKeysMap.get(key) as Promise<D>;
	};
}
