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

import { describe, expect, it, vi } from "vitest";
import { ManualPromise, signalToPromise } from "../../src/utils/manual-promise.js";

describe("ManualPromise", () => {
	it("resolves from the outside with a value", async () => {
		const promise = new ManualPromise<number>();
		expect(promise.isDone()).toBe(false);
		promise.resolve(42);
		await expect(promise).resolves.toBe(42);
		expect(promise.isDone()).toBe(true);
	});

	it("rejects from the outside with an error", async () => {
		const promise = new ManualPromise<number>();
		promise.reject(new Error("boom"));
		await expect(promise).rejects.toThrow("boom");
		expect(promise.isDone()).toBe(true);
	});

	it("is chainable, yielding a plain promise from then()", async () => {
		const promise = new ManualPromise<number>();
		const chained = promise.then((n) => n + 1);
		expect(chained).toBeInstanceOf(Promise);
		expect(chained).not.toBeInstanceOf(ManualPromise);
		promise.resolve(1);
		await expect(chained).resolves.toBe(2);
	});

	it("tags itself as ManualPromise", () => {
		const promise = new ManualPromise();
		expect(Object.prototype.toString.call(promise)).toBe("[object ManualPromise]");
		promise.resolve();
	});
});

describe("signalToPromise", () => {
	it("resolves when the signal aborts", async () => {
		const controller = new AbortController();
		const { promise, dispose } = signalToPromise(controller.signal);
		let settled = false;
		void promise.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);
		controller.abort();
		await promise;
		expect(settled).toBe(true);
		dispose();
	});

	it("is already resolved when the signal is pre-aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		const { promise, dispose } = signalToPromise(controller.signal);
		await expect(promise).resolves.toBeUndefined();
		expect(dispose).not.toThrow();
	});

	it("dispose detaches the abort listener", () => {
		const controller = new AbortController();
		const remove = vi.spyOn(controller.signal, "removeEventListener");
		const { dispose } = signalToPromise(controller.signal);
		dispose();
		expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
	});
});
