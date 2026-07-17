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
 * @fileoverview Inlined type guards, a logger stub, and small FIFO/timed-task
 * helpers. These are minimal copies of monorepo utilities so the package keeps
 * its zero-dependency guarantee rather than importing `@resq-systems/helpers`.
 *
 * @module @resq-systems/decorators/_utils
 */

//#region Type Guards

/**
 * Narrow `value` to a thenable (native `Promise` or a duck-typed then-able).
 *
 * @param value - The value to test.
 * @returns `true` when `value` exposes a callable `then`.
 */
export const isPromise = (value: unknown): value is Promise<unknown> =>
	value instanceof Promise ||
	(typeof value === "object" &&
		value !== null &&
		"then" in value &&
		typeof (value as { then: unknown }).then === "function");

/** Narrow `value` to any callable. */
export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
	typeof value === "function";

/** Narrow `value` to a real number, excluding `NaN`. */
export const isNumber = (value: unknown): value is number =>
	typeof value === "number" && !Number.isNaN(value);

/** Narrow `value` to a string. */
export const isString = (value: unknown): value is string => typeof value === "string";

//#endregion

//#region Logger

/** Minimal console-backed logger so decorators can report without a dependency. */
export const logger = {
	/**
	 * Log an informational message, appending JSON-encoded `data` when present.
	 *
	 * Writes one line to `console.info` (stdout) — an I/O side effect, not a pure
	 * call. `data` is serialized with `JSON.stringify`, so a circular reference or
	 * a `BigInt` value in it makes the call throw.
	 *
	 * @param message - The human-readable message.
	 * @param data - Optional structured context to serialize alongside `message`.
	 * @throws {TypeError} If `data` cannot be JSON-serialized (circular reference
	 *   or `BigInt` value).
	 */
	info(message: string, data?: Record<string, unknown>): void {
		const suffix = data ? ` ${JSON.stringify(data)}` : "";
		console.info(`INFO [decorators] ${message}${suffix}`);
	},
};

//#endregion

//#region Queue

interface QueueNode<T> {
	next: QueueNode<T> | null;
	value: T;
}

/** A minimal linked-list FIFO queue with O(1) enqueue and dequeue. */
export class Queue<T> {
	private firstItem: QueueNode<T> | null = null;
	private lastItem: QueueNode<T> | null = null;
	private size = 0;

	/** Return the number of queued items. */
	public getSize(): number {
		return this.size;
	}

	/** Return `true` when the queue holds no items. */
	public isEmpty(): boolean {
		return this.size === 0;
	}

	/**
	 * Append an item to the tail of the queue.
	 *
	 * Mutates the queue in place: links a new node at the tail and increments the
	 * size. Not idempotent — each call adds a distinct entry, duplicates included.
	 *
	 * @param item - The value to enqueue.
	 */
	public enqueue(item: T): void {
		const newItem: QueueNode<T> = { next: null, value: item };
		if (this.isEmpty()) {
			this.firstItem = newItem;
			this.lastItem = newItem;
		} else {
			if (this.lastItem) {
				this.lastItem.next = newItem;
			}
			this.lastItem = newItem;
		}
		this.size += 1;
	}

	/**
	 * Remove and return the item at the head of the queue.
	 *
	 * Mutates the queue in place: unlinks the head node and decrements the size.
	 * Signals emptiness by returning the sentinel `null` rather than throwing, so
	 * a stored `null` value is indistinguishable from "empty" — do not enqueue
	 * `null` if you rely on the return to detect drain.
	 *
	 * @returns The dequeued item, or `null` when the queue is empty.
	 */
	public dequeue(): T | null {
		let removedItem: T | null = null;
		if (!this.isEmpty() && this.firstItem) {
			removedItem = this.firstItem.value;
			this.firstItem = this.firstItem.next;
			this.size -= 1;
		}
		return removedItem;
	}
}

//#endregion

//#region Task Scheduler

interface TimedTask {
	func: (...args: unknown[]) => unknown;
	execTime: number;
}

/**
 * A minimal timer-backed scheduler that fires queued tasks in due-time order,
 * keeping a single active `setTimeout` for the nearest pending task.
 */
export class TaskExec {
	private readonly tasks: TimedTask[] = [];
	private handler: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Schedule `func` to run after `ttl` milliseconds.
	 *
	 * Effectful: reads the wall clock (`Date.now`), pushes onto and re-sorts the
	 * internal task list, and arms a single `setTimeout` for the nearest due task
	 * (rescheduling the shared timer if this task is now the soonest). `ttl` is a
	 * relative delay in milliseconds from the moment of the call, not an absolute
	 * timestamp. Tasks fire in due-time order regardless of insertion order.
	 *
	 * @param func - The callback to run once its delay elapses.
	 * @param ttl - Delay before execution, in milliseconds from now.
	 */
	exec(func: (...args: unknown[]) => unknown, ttl: number): void {
		this.tasks.push({ func, execTime: Date.now() + ttl });
		this.tasks.sort((a, b) => a.execTime - b.execTime);
		this.handleNext();
	}

	private handleNext(): void {
		if (!this.tasks.length) return;
		const { execTime } = this.tasks[0]!;
		this.execNext(Math.max(execTime - Date.now(), 0));
	}

	private execNext(ttl: number): void {
		clearTimeout(this.handler);
		this.handler = setTimeout(() => {
			const task = this.tasks.shift();
			if (task) task.func();
			this.handleNext();
		}, ttl);
	}
}

//#endregion
