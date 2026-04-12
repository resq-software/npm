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
import type { AfterConfig, AfterFunc } from './after.types.js';

/**
 * Wraps a method to execute an after hook function after the method completes.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to wrap
 * @param {AfterConfig<any, ReturnType<typeof originalMethod>>} config - Configuration for the after hook
 * @returns {(...args: any[]) => Promise<D>} The wrapped method
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
export function afterFn<D = any, A extends any[] = any[]>(
  originalMethod: Method<D, A>,
  config: AfterConfig<any, ReturnType<typeof originalMethod>>,
): (...args: unknown[]) => Promise<D> {
  const resolvedConfig: AfterConfig<any, ReturnType<typeof originalMethod>> = {
    wait: false,
    ...config,
  };

  return async function (this: any, ...args: A): Promise<D> {
    const afterFunc: AfterFunc<ReturnType<typeof originalMethod>> =
      typeof resolvedConfig.func === 'string'
        ? this[resolvedConfig.func].bind(this)
        : resolvedConfig.func;

    if (resolvedConfig.wait) {
      const response = await originalMethod.apply(this, args);
      afterFunc({
        args,
        response,
      });
      return response;
    }

    const response = originalMethod.apply(this, args);
    afterFunc({
      args,
      response,
    });
    return response;
  };
}
