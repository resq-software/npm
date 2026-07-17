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

import { describe, expect, it } from "vitest";
import { Semaphore } from "../../src/utils/semaphore.js";

describe("Semaphore", () => {
	it("permits up to max concurrent holders and blocks the rest", async () => {
		const gate = new Semaphore(2);
		await gate.acquire();
		await gate.acquire();

		let thirdEntered = false;
		void gate.acquire().then(() => {
			thirdEntered = true;
		});
		await Promise.resolve();
		expect(thirdEntered).toBe(false); // max reached

		gate.release();
		await Promise.resolve();
		expect(thirdEntered).toBe(true); // freed slot admits the waiter
	});

	it("releases waiters in FIFO order", async () => {
		const gate = new Semaphore(1);
		await gate.acquire();

		const order: number[] = [];
		const first = gate.acquire().then(() => order.push(1));
		const second = gate.acquire().then(() => order.push(2));

		gate.release();
		await first;
		gate.release();
		await second;

		expect(order).toEqual([1, 2]);
	});

	it("blocks every acquirer when max <= 0 until setMax raises it", async () => {
		const gate = new Semaphore(0);
		let entered = false;
		void gate.acquire().then(() => {
			entered = true;
		});
		await Promise.resolve();
		expect(entered).toBe(false);

		gate.setMax(1);
		await Promise.resolve();
		expect(entered).toBe(true);
	});

	it("bounds real concurrency across many tasks", async () => {
		const gate = new Semaphore(3);
		let active = 0;
		let peak = 0;

		const task = async (): Promise<void> => {
			await gate.acquire();
			active += 1;
			peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 5));
			active -= 1;
			gate.release();
		};

		await Promise.all(Array.from({ length: 12 }, task));
		expect(peak).toBeLessThanOrEqual(3);
		expect(active).toBe(0);
	});
});
