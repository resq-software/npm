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

/**
 * @fileoverview Execute decorator - automatically instantiates a class
 * when it's decorated. Useful for singleton pattern implementation.
 *
 * @module @resq/typescript/decorators/execute
 *
 * @example
 * ```typescript
 * @selfExecute
 * class SingletonService {
 *   private static instance: SingletonService;
 *
 *   constructor() {
 *     if (SingletonService.instance) {
 *       return SingletonService.instance;
 *     }
 *     SingletonService.instance = this;
 *   }
 *
 *   doSomething(): void {
 *     console.log('Doing something');
 *   }
 * }
 *
 * // The class is automatically instantiated
 * // SingletonService.doSomething(); // If methods were static
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

/**
 * Class decorator that automatically instantiates the class when decorated.
 * Creates an instance immediately and returns the constructor.
 *
 * @template T - The type of the class constructor
 * @param {T} constructor - The class constructor
 * @returns {T} The constructor (with instance created as side effect)
 *
 * @example
 * ```typescript
 * @selfExecute
 * class AutoStartService {
 *   private timer: NodeJS.Timeout;
 *
 *   constructor() {
 *     console.log('Service auto-started');
 *     this.timer = setInterval(() => this.tick(), 1000);
 *   }
 *
 *   tick(): void {
 *     console.log('Tick');
 *   }
 * }
 *
 * // Service is already running when this module loads
 * ```
 */
export const selfExecute = <T extends new (...args: any[]) => object>(constructor: T): T => {
  const _instance = new constructor();
  return constructor;
};
