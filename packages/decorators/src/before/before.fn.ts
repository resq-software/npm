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
import type { BeforeConfig } from './before.types.js';

/**
 * Wraps a method to execute a before hook function before the method runs.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to wrap
 * @param {BeforeConfig<any>} config - Configuration for the before hook
 * @returns {Method<Promise<D>, A>} The wrapped method
 *
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
export function beforeFn<D = any, A extends any[] = any[]>(
  originalMethod: Method<D, A>,
  config: BeforeConfig<any>,
): Method<Promise<D>, A> {
  const resolvedConfig: BeforeConfig<any> = {
    wait: false,
    ...config,
  };

  return async function (this: any, ...args: A): Promise<D> {
    const beforeFunc =
      typeof resolvedConfig.func === 'string'
        ? this[resolvedConfig.func].bind(this)
        : resolvedConfig.func;

    if (resolvedConfig.wait) {
      await beforeFunc();
      return originalMethod.apply(this, args);
    }

    beforeFunc();
    return originalMethod.apply(this, args);
  };
}
