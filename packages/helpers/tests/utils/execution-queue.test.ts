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

import { describe, expect, it } from "vitest";
import { promiseWithResolve, sleep } from "../../src/utils/control.js";
import { ExecutionQueue } from "../../src/utils/execution-queue.js";

const tick = () => Promise.resolve();

describe("ExecutionQueue", () => {
	it("executes tasks sequentially", async () => {
		const queue = new ExecutionQueue();
		let numExecutions = 0;

		await queue.push(async () => {
			await sleep(1);
			numExecutions++;
		});

		//number of exeutions is 1 because we await the first task
		expect(numExecutions).toBe(1);

		// push without awaiting
		queue.push(async () => {
			await sleep(1);
			numExecutions++;
		});

		// number of exeutions is still 1 because we didn't await the second task
		expect(numExecutions).toBe(1);

		await sleep(5); // wait for the second task to finish

		// number of exeutions is 2 because we waited for the second task to finish
		expect(numExecutions).toBe(2);
	});

	it("queues tasks when one is already executing", async () => {
		const completions: string[] = [];
		const promise = promiseWithResolve();
		const queue = new ExecutionQueue();

		const persistPromiseA = queue.push(async () => {
			await promise;
			completions.push("A");
		});

		const persistPromiseB = queue.push(async () => {
			completions.push("B");
		});

		await tick();
		expect(completions).toEqual([]);

		promise.resolve(undefined);
		await persistPromiseA;
		expect(completions).toEqual(["A"]);
		await persistPromiseB;
		expect(completions).toEqual(["A", "B"]);
	});

	it("propagates errors from tasks", async () => {
		const queue = new ExecutionQueue();
		const promise = promiseWithResolve();

		const result = queue.push(async () => {
			await promise;
		});

		promise.reject(new Error("oh no"));

		await expect(result).rejects.toThrow("oh no");
	});

	it("rejects on a synchronous throw without stranding later tasks", async () => {
		const queue = new ExecutionQueue();

		const failing = queue.push(() => {
			throw new Error("sync boom");
		});

		const following = queue.push(async () => "next");

		await expect(failing).rejects.toThrow("sync boom");
		await expect(following).resolves.toBe("next");
	});

	it("handles constructor with timeout", async () => {
		const queue = new ExecutionQueue(10); // 10ms delay
		const executionOrder: string[] = [];

		const startTime = Date.now();

		// Add first task
		queue.push(async () => {
			executionOrder.push("A");
		});

		// Add second task
		queue.push(async () => {
			executionOrder.push("B");
		});

		// Wait for both tasks to complete
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(executionOrder).toEqual(["A", "B"]);
		// Should have taken at least 10ms due to timeout delay
		expect(Date.now() - startTime).toBeGreaterThanOrEqual(10);
	});

	it("isEmpty returns correct state", async () => {
		const queue = new ExecutionQueue();

		// Initially empty
		expect(queue.isEmpty()).toBe(true);

		// After adding a task, should not be empty
		const taskPromise = queue.push(async () => {
			await sleep(1);
		});

		expect(queue.isEmpty()).toBe(false);

		// Resolve the task and wait a tick for it to finish
		await taskPromise;
		await tick();

		// Should be empty again
		expect(queue.isEmpty()).toBe(true);
	});

	it("close clears pending tasks", async () => {
		const queue = new ExecutionQueue();
		const executionOrder: string[] = [];
		const promise = promiseWithResolve();

		// Add first task that will run
		queue.push(async () => {
			await promise;
			executionOrder.push("A");
		});

		// Add second task that should be cleared
		queue.push(async () => {
			executionOrder.push("B");
		});

		// Add third task that should be cleared
		queue.push(async () => {
			executionOrder.push("C");
		});

		// Close the queue - this should clear pending tasks
		queue.close();

		// Resolve the first task
		promise.resolve(undefined);
		await sleep(10);

		// Only the first task should have executed
		expect(executionOrder).toEqual(["A"]);
	});

	it("allows adding tasks after close", async () => {
		const queue = new ExecutionQueue();
		const executionOrder: string[] = [];

		// Close the queue
		queue.close();

		// Add tasks after closing
		queue.push(async () => {
			executionOrder.push("A");
		});

		queue.push(async () => {
			executionOrder.push("B");
		});

		await sleep(10);

		// Tasks should still execute
		expect(executionOrder).toEqual(["A", "B"]);
	});

	it("handles multiple rapid push calls", async () => {
		const queue = new ExecutionQueue();
		const executionOrder: number[] = [];

		// Add multiple tasks rapidly without awaiting
		const promises = [];
		for (let i = 0; i < 5; i++) {
			promises.push(
				queue.push(async () => {
					executionOrder.push(i);
				}),
			);
		}

		// Wait for all tasks to complete
		await Promise.all(promises);

		// Should execute in order
		expect(executionOrder).toEqual([0, 1, 2, 3, 4]);
	});

	it("handles close while task is running", async () => {
		const queue = new ExecutionQueue();
		const executionOrder: string[] = [];
		const promise = promiseWithResolve();

		// Start a task that will take time
		const runningTask = queue.push(async () => {
			await promise;
			executionOrder.push("running");
		});

		// Add a task that will be queued
		queue.push(async () => {
			executionOrder.push("queued");
		});

		// Close while first task is still running
		queue.close();

		// Resolve the running task
		promise.resolve(undefined);
		await runningTask;

		// Wait a bit to ensure no other tasks run
		await sleep(10);

		// Only the running task should have executed
		expect(executionOrder).toEqual(["running"]);
	});
});
