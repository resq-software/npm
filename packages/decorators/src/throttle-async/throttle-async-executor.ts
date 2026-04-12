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

import { Queue } from '../_utils.js';
import type { AsyncMethod } from '../types.js';

/**
 * Manages the queue and execution of throttled async method calls.
 * Ensures that only a specified number of calls run concurrently,
 * queueing additional calls until slots become available.
 *
 * @class ThrottleAsyncExecutor
 * @template D - The resolved type of the async method
 *
 * @example
 * ```typescript
 * const executor = new ThrottleAsyncExecutor(
 *   async (data) => await fetchData(data),
 *   3 // Max 3 concurrent calls
 * );
 *
 * // Execute multiple calls
 * const promises = [
 *   executor.exec(this, ['arg1']),
 *   executor.exec(this, ['arg2']),
 *   executor.exec(this, ['arg3']),
 *   executor.exec(this, ['arg4']), // Queued
 *   executor.exec(this, ['arg5']), // Queued
 * ];
 *
 * const results = await Promise.all(promises);
 * ```
 */
export class ThrottleAsyncExecutor<D> {
  /**
   * Number of calls currently executing.
   * @private
   * @type {number}
   */
  private onGoingCallsCount = 0;

  /**
   * Queue of pending calls waiting to execute.
   * @private
   * @type {Queue<CallArgs<D>>}
   */
  private readonly callsToRun = new Queue<CallArgs<D>>();

  /**
   * Creates a new ThrottleAsyncExecutor instance.
   *
   * @param {AsyncMethod<D>} fun - The async method to throttle
   * @param {number} parallelCalls - Maximum number of concurrent calls allowed
   */
  constructor(
    private readonly fun: AsyncMethod<D>,
    private readonly parallelCalls: number,
  ) {}

  /**
   * Queues a method call for execution.
   *
   * @param {any} context - The `this` context for the method call
   * @param {any[]} args - The arguments to pass to the method
   * @returns {Promise<D>} A promise that resolves with the method result
   *
   * @example
   * ```typescript
   * const executor = new ThrottleAsyncExecutor(myAsyncMethod, 2);
   *
   * // Queue a call
   * const result = await executor.exec(this, ['arg1', 'arg2']);
   * ```
   */
  exec(context: unknown, args: unknown[]): Promise<D> {
    const callArgs: CallArgs<D> = { context, args, resolve: null!, reject: null! };
    this.callsToRun.enqueue(callArgs);

    const proms = new Promise<D>((resolve, reject) => {
      callArgs.resolve = resolve;
      callArgs.reject = reject;
    });

    this.tryCall();

    (proms as unknown as { hell: unknown }).hell = args[0];

    return proms;
  }

  /**
   * Attempts to execute the next queued call if capacity allows.
   *
   * @private
   * @returns {void}
   */
  private tryCall(): void {
    if (this.callsToRun.getSize() > 0 && this.onGoingCallsCount < this.parallelCalls) {
      const callArgs = this.callsToRun.dequeue();
      if (callArgs) {
        const { context, args, resolve, reject } = callArgs;
        this.onGoingCallsCount += 1;
        this.fun
          .apply(context, args)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.onGoingCallsCount -= 1;
            this.tryCall();
          });
      }
    }
  }
}

/**
 * Arguments for a queued async call.
 *
 * @interface CallArgs
 * @template T - The resolved type of the async call
 * @property {unknown} context - The `this` context
 * @property {unknown[]} args - The method arguments
 * @property {(value: T | PromiseLike<T>) => void} resolve - Promise resolve function
 * @property {(reason?: unknown) => void} reject - Promise reject function
 */
interface CallArgs<T> {
  context: unknown;
  args: unknown[];
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}
