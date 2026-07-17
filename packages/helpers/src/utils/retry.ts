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
 * @fileoverview `retry` — re-invokes an async function until it succeeds or a max
 * attempt count is reached, with configurable wait, abort signal, and error
 * filtering.
 *
 * @module @resq-systems/helpers/utils/retry
 */

import { sleep } from "./control";

/**
 * Retries an async operation with configurable attempt count, wait duration, and error filtering.
 * Executes the provided async function repeatedly until it succeeds or the maximum number of attempts is reached.
 * Includes support for abort signals and custom error matching to determine which errors should trigger retries.
 *
 * Cancellation is cooperative and coarse: `abortSignal` is polled only at the top
 * of each attempt, so aborting does not interrupt an in-flight `fn` or a wait in
 * progress — it takes effect before the next attempt. The inter-attempt wait runs
 * after every failure, including the final one, so a run that exhausts all
 * attempts still sleeps once more before rejecting. `fn` receives 0-based
 * `attempt`, `remaining` (`attempts - attempt`), and `total` (`attempts`).
 *
 * @param fn - The async function to retry on failure
 * @param options - Configuration options for retry behavior:
 *   - `attempts`: Maximum number of retry attempts (default: 3)
 *   - `waitDuration`: Milliseconds to wait between retry attempts (default: 1000)
 *   - `abortSignal`: Optional AbortSignal to cancel the retry operation
 *   - `matchError`: Optional function to determine if an error should trigger a retry
 * @returns Promise that resolves with the function's return value on the first
 *   successful attempt.
 * @throws {Error} `"aborted"` if `abortSignal` is already aborted when an attempt
 *   is about to start.
 * @throws The last error thrown by `fn` once `attempts` is exhausted (re-thrown
 *   as-is, so it may be any value, not necessarily an `Error`).
 * @throws Immediately re-throws `fn`'s error, without retrying, when `matchError`
 *   is provided and returns `false` for it.
 *
 * @example
 * ```ts
 * // Basic retry with default settings (3 attempts, 1 second wait)
 * const data = await retry(async () => {
 *   const response = await fetch('/api/data')
 *   if (!response.ok) throw new Error('Network error')
 *   return response.json()
 * })
 *
 * // Custom retry configuration
 * const result = await retry(
 *   async () => unreliableApiCall(),
 *   {
 *     attempts: 5,
 *     waitDuration: 2000,
 *     matchError: (error) => error instanceof NetworkError
 *   }
 * )
 *
 * // With abort signal for cancellation
 * const controller = new AbortController()
 * setTimeout(() => controller.abort(), 10000) // Cancel after 10 seconds
 *
 * const data = await retry(
 *   async () => fetchData(),
 *   {
 *     attempts: 10,
 *     abortSignal: controller.signal
 *   }
 * )
 * ```
 *
 * @internal
 */
export async function retry<T>(
	fn: (args: { attempt: number; remaining: number; total: number }) => Promise<T>,
	{
		attempts = 3,
		waitDuration = 1000,
		abortSignal,
		matchError,
	}: {
		attempts?: number;
		waitDuration?: number;
		abortSignal?: AbortSignal;
		matchError?(error: unknown): boolean;
	} = {},
): Promise<T> {
	let error: unknown = null;
	for (let i = 0; i < attempts; i++) {
		if (abortSignal?.aborted) throw new Error("aborted");
		try {
			return await fn({ attempt: i, remaining: attempts - i, total: attempts });
		} catch (e) {
			if (matchError && !matchError(e)) throw e;
			error = e;
			await sleep(waitDuration);
		}
	}
	// eslint-disable-next-line no-throw-literal
	throw error;
}
