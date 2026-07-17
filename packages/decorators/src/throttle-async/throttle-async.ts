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
 * @fileoverview `@throttleAsync` decorator — caps the number of concurrent
 * in-flight executions of an async method, queuing excess calls and running them
 * in FIFO order as slots free up.
 *
 * @module @resq-systems/decorators/throttle-async/throttle-async
 */

import type { AsyncDecorator } from "../types.js";
import { throttleAsyncFn } from "./throttle-async.fn.js";

/**
 * Limit an async method to `parallelCalls` concurrent executions; excess calls
 * queue and run in FIFO order as slots free up.
 *
 * @template T - The class type that owns the decorated method.
 * @param parallelCalls - Maximum number of concurrent calls; defaults to `1`.
 * @returns The async method decorator.
 * @throws {Error} If applied to anything other than a method.
 * @example
 * ```ts
 * class BatchProcessor {
 *   // Process up to five items concurrently.
 *   @throttleAsync(5)
 *   async processItem(item: Item): Promise<Result> {
 *     return await this.performHeavyProcessing(item);
 *   }
 * }
 *
 * const processor = new BatchProcessor();
 * const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
 *
 * // Process 100 items, five at a time.
 * const results = await Promise.all(items.map((item) => processor.processItem(item)));
 * ```
 * @see {@link throttleAsyncFn} for the function form.
 */
export function throttleAsync<T = unknown>(parallelCalls?: number): AsyncDecorator<T> {
	return <F extends (...args: never[]) => Promise<unknown>>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => {
		if (descriptor.value) {
			descriptor.value = throttleAsyncFn(descriptor.value, parallelCalls) as F;

			return descriptor;
		}

		throw new Error("@throttleAsync is applicable only on a methods.");
	};
}
