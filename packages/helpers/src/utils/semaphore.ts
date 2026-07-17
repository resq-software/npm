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

/*!
 * Adapted from Microsoft Playwright — packages/isomorphic/semaphore.ts
 * https://github.com/microsoft/playwright
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * @file An async counting semaphore for bounding concurrency.
 * @module @resq-systems/helpers/semaphore
 */

import { ManualPromise } from "./manual-promise.js";

/**
 * An async counting semaphore that caps how many holders may proceed
 * concurrently. A caller `await`s {@link Semaphore.acquire | acquire} before
 * entering the guarded section and must call {@link Semaphore.release | release}
 * exactly once when finished — pair them with `try`/`finally`.
 *
 * Waiters are released in FIFO order.
 *
 * @example
 * ```ts
 * const gate = new Semaphore(2); // at most 2 concurrent fetches
 * await Promise.all(
 *   urls.map(async (url) => {
 *     await gate.acquire();
 *     try {
 *       return await fetch(url);
 *     } finally {
 *       gate.release();
 *     }
 *   }),
 * );
 * ```
 */
export class Semaphore {
	#max: number;
	#acquired = 0;
	#queue: ManualPromise[] = [];

	/**
	 * @param max - Maximum number of holders allowed at once. Values `<= 0` block
	 *   every acquirer until {@link Semaphore.setMax | setMax} raises the limit.
	 */
	constructor(max: number) {
		this.#max = max;
	}

	/**
	 * Change the maximum concurrency. Raising it flushes any waiters that now
	 * fit; lowering it only takes effect as in-flight holders release.
	 */
	public setMax(max: number): void {
		this.#max = max;
		this.#flush();
	}

	/** Acquire a slot; the returned promise resolves once one is available. */
	public acquire(): Promise<void> {
		const lock = new ManualPromise();
		this.#queue.push(lock);
		this.#flush();
		return lock;
	}

	/** Release a previously-acquired slot, letting the next waiter proceed. */
	public release(): void {
		--this.#acquired;
		this.#flush();
	}

	#flush(): void {
		while (this.#acquired < this.#max && this.#queue.length) {
			++this.#acquired;
			this.#queue.shift()?.resolve();
		}
	}
}
