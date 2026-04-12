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

import type { AsyncMethod } from '../types.js';

/*
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

/**
 * @fileoverview Delegate function implementation - wraps an async method to
 * deduplicate concurrent calls with the same arguments.
 *
 * @module @resq/typescript/decorators/delegate.fn
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

/**
 * Wraps an async method to deduplicate concurrent calls.
 * Multiple calls with the same key will share the same promise
 * until the first one completes.
 *
 * @template D - The resolved type of the promise
 * @template A - The argument types of the original method
 * @param {AsyncMethod<D, A>} originalMethod - The async method to wrap
 * @param {(...args: A) => string} [keyResolver] - Optional function to generate cache keys
 * @returns {AsyncMethod<D, A>} The delegated method
 *
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
export function delegateFn<D = any, A extends any[] = any[]>(
  originalMethod: AsyncMethod<D, A>,
  keyResolver?: (...args: A) => string,
): AsyncMethod<D, A> {
  const delegatedKeysMap = new Map<string, Promise<D>>();
  const keyGenerator: (...args: unknown[]) => string =
    keyResolver ?? ((...args) => JSON.stringify(args));

  return function (this: any, ...args: A): Promise<D> {
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
