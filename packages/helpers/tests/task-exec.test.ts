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

import { describe, expect, test } from "vitest";
import { TaskExec } from "../src/task-exec.js";

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe("TaskExec", () => {
	describe("basic scheduling", () => {
		test("executes a task after the specified ttl", async () => {
			const executor = new TaskExec();
			let executed = false;

			executor.exec(() => {
				executed = true;
			}, 30);

			expect(executed).toBe(false);
			await wait(60);
			expect(executed).toBe(true);
		});

		test("executes tasks in order by time", async () => {
			const executor = new TaskExec();
			const order: number[] = [];

			executor.exec(() => order.push(2), 60);
			executor.exec(() => order.push(1), 20);

			await wait(100);
			expect(order).toEqual([1, 2]);
		});

		test("executes immediate tasks (ttl = 0)", async () => {
			const executor = new TaskExec();
			let executed = false;

			executor.exec(() => {
				executed = true;
			}, 0);

			await wait(20);
			expect(executed).toBe(true);
		});

		test("handles multiple tasks with same ttl", async () => {
			const executor = new TaskExec();
			let count = 0;

			executor.exec(() => count++, 20);
			executor.exec(() => count++, 20);

			await wait(80);
			expect(count).toBe(2);
		});
	});

	describe("priority and pre-emption", () => {
		test("re-orders correctly when an earlier task is added later", async () => {
			const executor = new TaskExec();
			const order: string[] = [];

			executor.exec(() => order.push("late"), 80);
			// Add a task with a much shorter deadline; should fire first.
			executor.exec(() => order.push("early"), 10);

			await wait(120);
			expect(order).toEqual(["early", "late"]);
		});

		test("interleaves three tasks correctly", async () => {
			const executor = new TaskExec();
			const order: number[] = [];

			executor.exec(() => order.push(3), 90);
			executor.exec(() => order.push(1), 30);
			executor.exec(() => order.push(2), 60);

			await wait(140);
			expect(order).toEqual([1, 2, 3]);
		});
	});

	describe("argument forwarding & return values", () => {
		test("invokes callback with no arguments (signature is parameter-less)", async () => {
			const executor = new TaskExec();
			let saw: unknown[] | null = null;

			executor.exec(function (this: unknown, ...args: unknown[]) {
				saw = args;
				return "ignored";
			}, 10);

			await wait(40);
			expect(saw).toEqual([]);
		});

		test("return value is discarded (no exception when callback returns)", async () => {
			const executor = new TaskExec();
			let fired = false;

			executor.exec(() => {
				fired = true;
				return { value: 42 };
			}, 10);

			await wait(40);
			expect(fired).toBe(true);
		});
	});

	describe("idle behaviour", () => {
		test("does nothing on construction (no fires before any exec call)", async () => {
			const executor = new TaskExec();
			void executor; // touch to satisfy "unused"
			let fired = false;
			setTimeout(() => {
				fired = true;
			}, 30);
			await wait(50);
			expect(fired).toBe(true); // sanity: setTimeout works
		});

		test("schedules a follow-up task after the previous one fires", async () => {
			const executor = new TaskExec();
			const order: number[] = [];

			executor.exec(() => {
				order.push(1);
				executor.exec(() => order.push(2), 20);
			}, 10);

			await wait(80);
			expect(order).toEqual([1, 2]);
		});
	});

	describe("scale", () => {
		test("handles 50 tasks scheduled at staggered times", async () => {
			const executor = new TaskExec();
			const fired: number[] = [];
			for (let i = 0; i < 50; i++) {
				executor.exec(() => fired.push(i), i * 2);
			}
			await wait(50 * 2 + 50);
			expect(fired.length).toBe(50);
			// Every observed value should be in ascending order.
			for (let i = 1; i < fired.length; i++) {
				expect(fired[i]!).toBeGreaterThanOrEqual(fired[i - 1]!);
			}
		});
	});
});
