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
 * @fileoverview `ThrottleAsyncExecutor` — the queue engine behind `@throttleAsync`
 * that caps concurrent executions and dispatches queued calls as slots free up.
 *
 * @module @resq-systems/decorators/throttle-async/throttle-async-executor
 */

import { Queue } from "../_utils.js";
import type { AsyncMethod } from "../types.js";

/**
 * Manages the queue and execution of throttled async calls, ensuring at most a
 * fixed number run concurrently and queuing the rest until a slot frees up.
 *
 * Queued calls dispatch in FIFO order; each slot is released once its call settles
 * (resolve or reject), which drives the next dispatch. `parallelCalls` must be
 * `>= 1` — the constructor does not validate it, and a value below `1` leaves
 * `tryCall` unable to ever dispatch, so every queued call hangs.
 *
 * @template D - The resolved type of the async method.
 * @example
 * ```ts
 * const executor = new ThrottleAsyncExecutor(
 *   async (data) => await fetchData(data),
 *   3, // At most three concurrent calls.
 * );
 *
 * // Execute multiple calls.
 * const promises = [
 *   executor.exec(this, ["arg1"]),
 *   executor.exec(this, ["arg2"]),
 *   executor.exec(this, ["arg3"]),
 *   executor.exec(this, ["arg4"]), // Queued.
 *   executor.exec(this, ["arg5"]), // Queued.
 * ];
 *
 * const results = await Promise.all(promises);
 * ```
 */
export class ThrottleAsyncExecutor<D> {
	/** Number of calls currently executing. */
	private onGoingCallsCount = 0;

	/** Queue of pending calls waiting for a free slot. */
	private readonly callsToRun = new Queue<CallArgs<D>>();

	/**
	 * Create a new executor.
	 *
	 * @param fun - The async method to throttle.
	 * @param parallelCalls - Maximum number of concurrent calls allowed.
	 */
	constructor(
		private readonly fun: AsyncMethod<D>,
		private readonly parallelCalls: number,
	) {}

	/**
	 * Queue a method call, executing it immediately if a slot is free or deferring
	 * it until one opens.
	 *
	 * Appends to the internal queue and may synchronously start the call; queued
	 * calls preserve FIFO order. The returned promise mirrors the method outcome —
	 * a thrown/rejected method rejects it with the same reason.
	 *
	 * @param context - The `this` context for the method call.
	 * @param args - The arguments to pass to the method.
	 * @returns A promise that resolves (or rejects) with the method's result.
	 * @example
	 * ```ts
	 * const executor = new ThrottleAsyncExecutor(myAsyncMethod, 2);
	 *
	 * // Queue a call.
	 * const result = await executor.exec(this, ["arg1", "arg2"]);
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

		return proms;
	}

	/**
	 * Dispatch the next queued call when a concurrency slot is available; a no-op
	 * when the queue is empty or all slots are busy. Re-invoked after each call
	 * settles to drain the queue.
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
 * A queued async call plus the deferred promise handles used to settle it once
 * the executor dispatches it.
 *
 * @template T - The resolved type of the async call.
 */
interface CallArgs<T> {
	/** The `this` context to invoke the method with. */
	context: unknown;
	/** The arguments to pass to the method. */
	args: unknown[];
	/** Resolves the caller's promise with the method result. */
	resolve: (value: T | PromiseLike<T>) => void;
	/** Rejects the caller's promise on failure. */
	reject: (reason?: unknown) => void;
}
