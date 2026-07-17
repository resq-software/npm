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
 * Adapted from Microsoft Playwright — packages/isomorphic/manualPromise.ts
 * https://github.com/microsoft/playwright
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * @file A promise whose `resolve`/`reject` are callable from the outside
 *       (a "deferred"), plus an `AbortSignal` → promise bridge.
 * @module @resq-systems/helpers/manual-promise
 */

/**
 * A {@link Promise} whose settlement is controlled from the outside via
 * {@link ManualPromise.resolve | resolve} / {@link ManualPromise.reject | reject}
 * — the classic "deferred" primitive. Useful for bridging callback/event APIs
 * into `async`/`await`, or for handing a value off between a producer and a
 * consumer that don't share a call stack.
 *
 * It extends the native `Promise`, so it is awaitable and `.then`-able directly.
 * Chained operations (`.then`, `.catch`, `.finally`) return plain `Promise`s via
 * `Symbol.species`, not `ManualPromise`s.
 *
 * @template T - The resolved value type (defaults to `void`).
 *
 * @example
 * ```ts
 * const ready = new ManualPromise<number>();
 * setTimeout(() => ready.resolve(42), 10);
 * const value = await ready; // → 42
 * ready.isDone(); // → true
 * ```
 */
export class ManualPromise<T = void> extends Promise<T> {
	#resolve!: (value: T) => void;
	#reject!: (reason?: unknown) => void;
	#isDone = false;

	constructor() {
		let resolve!: (value: T) => void;
		let reject!: (reason?: unknown) => void;
		super((f, r) => {
			resolve = f;
			reject = r;
		});
		this.#resolve = resolve;
		this.#reject = reject;
	}

	/** @returns `true` once the promise has been resolved or rejected. */
	public isDone(): boolean {
		return this.#isDone;
	}

	/** Resolve the promise with `value`. */
	public resolve(value: T): void {
		this.#isDone = true;
		this.#resolve(value);
	}

	/** Reject the promise with `reason` (any value, matching native `Promise`). */
	public reject(reason?: unknown): void {
		this.#isDone = true;
		this.#reject(reason);
	}

	// Chained operations should yield plain promises, not `ManualPromise`s
	// (whose constructor takes no executor).
	static override get [Symbol.species](): PromiseConstructor {
		return Promise;
	}

	override get [Symbol.toStringTag](): string {
		return "ManualPromise";
	}
}

/**
 * Bridge an {@link AbortSignal} to a promise that resolves when the signal
 * aborts. Returns the `promise` plus a `dispose` callback that detaches the
 * internal listener — always call `dispose` (e.g. in a `finally`) to avoid
 * leaking a listener on a long-lived signal.
 *
 * If the signal is already aborted, the promise is already resolved and
 * `dispose` is a no-op.
 *
 * @example
 * ```ts
 * const { promise, dispose } = signalToPromise(controller.signal);
 * try {
 *   await Promise.race([work(), promise]);
 * } finally {
 *   dispose();
 * }
 * ```
 */
export function signalToPromise(signal: AbortSignal): {
	promise: Promise<void>;
	dispose: () => void;
} {
	if (signal.aborted) {
		return { promise: Promise.resolve(), dispose: () => {} };
	}
	// `cleanup` is nulled once the signal aborts (the `{ once: true }` listener
	// has already detached itself by then), so `dispose` releases its references
	// promptly and is a no-op if called afterwards.
	let cleanup: (() => void) | null = null;
	const promise = new Promise<void>((resolve) => {
		const onAbort = (): void => {
			cleanup = null;
			resolve();
		};
		signal.addEventListener("abort", onAbort, { once: true });
		cleanup = (): void => signal.removeEventListener("abort", onAbort);
	});
	return {
		promise,
		dispose: (): void => {
			if (cleanup) {
				cleanup();
				cleanup = null;
			}
		},
	};
}
