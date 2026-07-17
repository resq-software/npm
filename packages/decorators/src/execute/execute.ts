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
 * @fileoverview `@selfExecute` class decorator — automatically instantiates a
 * class when it is decorated, so its side-effectful constructor runs as the
 * module loads. Useful for singleton-pattern implementations.
 *
 * @module @resq-systems/decorators/execute/execute
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
 */

/**
 * Class decorator that automatically instantiates the class when decorated.
 * Creates an instance immediately and returns the constructor.
 *
 * The instantiation is a **side effect that runs at decoration time** — i.e. as
 * the class's module is evaluated — so the constructor's effects (registering
 * listeners, singleton wiring, telemetry init) fire on import. The created
 * instance is discarded, not returned or retained here; only what the
 * constructor does persists (e.g. a static singleton it stores on itself). The
 * constructor is returned **unchanged**, so the class's own type is preserved.
 * Anything the constructor throws propagates out of module evaluation.
 *
 * @template T - The class constructor type; the `new (...args: never[]) => object`
 *   bound requires a constructor callable with no required arguments.
 * @param constructor - The class constructor.
 * @returns The constructor (with the instance created as a side effect).
 * @throws Whatever `constructor` throws, at decoration/module-load time.
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
export const selfExecute = <T extends new (...args: never[]) => object>(constructor: T): T => {
	const _instance = new constructor();
	return constructor;
};
