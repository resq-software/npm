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
 * @fileoverview Binary-heap priority queue with min/max/custom ordering for
 * deadline-based, numeric, or bespoke priority dispatch, plus factory helpers.
 *
 * @module @resq-systems/dsa/priority-queue
 */

import {
	PriorityItemSchema,
	PriorityQueueOptionsSchema,
	type PriorityItemInput,
	validateSafe,
} from "./schemas.js";

//#region Types

/**
 * Comparison function for priority-queue ordering. Returns a negative number
 * when `a` outranks `b`, a positive number when `b` outranks `a`, and `0` when
 * they are equal.
 */
export type CompareFn<T> = (a: T, b: T) => number;

/**
 * Options for priority-queue configuration.
 */
export interface PriorityQueueOptions<T> {
	/** Custom comparison function (default: min-heap with numeric comparison) */
	compareFn?: CompareFn<T>;
	/** Initial capacity for the underlying array */
	initialCapacity?: number;
}

/**
 * Element types the built-in default comparator can order safely: the JS
 * primitives with a meaningful `<`/`-` ordering.
 */
type Comparable = number | string | bigint;

/**
 * Options refined by element type. For {@link Comparable} elements the default
 * numeric/lexicographic comparator is sound, so `compareFn` stays optional. For
 * every other element type (objects, tuples, unions, …) a `compareFn` is
 * **required** — otherwise the default comparator would stringify elements and
 * silently mis-order them, which is dangerous for a triage/dispatch queue.
 */
export type PQOptions<T> = [T] extends [Comparable]
	? PriorityQueueOptions<T>
	: PriorityQueueOptions<T> & Required<Pick<PriorityQueueOptions<T>, "compareFn">>;

/**
 * Constructor/factory argument tuple derived from {@link PQOptions}. The tuple
 * makes the options argument optional for {@link Comparable} elements but
 * required for non-comparable ones, so `new PriorityQueue<Task>()` (object
 * element, no comparator) is a compile error while `new PriorityQueue<number>()`
 * keeps working.
 */
export type PQArgs<T> = [T] extends [Comparable]
	? [options?: PQOptions<T>]
	: [options: PQOptions<T>];

/**
 * Priority-queue statistics snapshot.
 */
export interface PriorityQueueStats {
	/** Current number of elements */
	size: number;
	/** Current capacity of underlying array */
	capacity: number;
	/** Whether the queue is empty */
	isEmpty: boolean;
}

//#endregion

//#region Public API

/**
 * Priority queue implemented as a binary heap.
 *
 * By default this is a min-heap where the smallest element has highest
 * priority. Supply a custom `compareFn` for a max-heap or bespoke ordering.
 *
 * Time Complexity:
 * - enqueue (insert): O(log n)
 * - dequeue (extractMin/Max): O(log n)
 * - peek: O(1)
 * - contains: O(n)
 * - updatePriority: O(n + log n)
 *
 * Space Complexity: O(n)
 *
 * @template T - Type of elements in the queue
 *
 * @example
 * ```ts
 * // Min-heap by deadline
 * const requestQueue = new PriorityQueue<Request>({
 *   compareFn: (a, b) => a.deadline.getTime() - b.deadline.getTime()
 * });
 *
 * requestQueue.enqueue({ id: '1', deadline: new Date('2025-01-15') });
 * requestQueue.enqueue({ id: '2', deadline: new Date('2025-01-10') });
 *
 * const mostUrgent = requestQueue.dequeue();
 * // Returns request with deadline 2025-01-10
 * ```
 */
export class PriorityQueue<T> {
	private heap: T[];
	private readonly compare: CompareFn<T>;

	/**
	 * Creates a new priority queue.
	 *
	 * @param options - Configuration options. A `compareFn` is required for
	 *   non-{@link Comparable} element types (see {@link PQArgs}).
	 * @throws {Error} If options validation fails.
	 */
	constructor(...args: PQArgs<T>) {
		const options: PriorityQueueOptions<T> = args[0] ?? {};

		// Validate options using Effect Schema (only numeric options)
		const validation = validateSafe(PriorityQueueOptionsSchema, {
			initialCapacity: options.initialCapacity,
		});
		if (!validation.success) {
			throw new Error(`Invalid PriorityQueue options: ${validation.error}`);
		}

		const { compareFn } = options;
		const initialCapacity = validation.data.initialCapacity ?? 16;

		this.heap = new Array(initialCapacity);
		this.heap.length = 0;

		// Default to min-heap with numeric comparison
		this.compare =
			compareFn ??
			((a: T, b: T) => {
				if (typeof a === "number" && typeof b === "number") {
					return a - b;
				}
				return String(a).localeCompare(String(b));
			});
	}

	/**
	 * Returns the number of elements in the queue.
	 */
	get size(): number {
		return this.heap.length;
	}

	/**
	 * Whether the queue currently holds no elements.
	 */
	get isEmpty(): boolean {
		return this.heap.length === 0;
	}

	/**
	 * Adds an element to the queue, restoring the heap invariant.
	 *
	 * @param element - Element to add.
	 * @returns This queue, for chaining.
	 */
	enqueue(element: T): this {
		this.heap.push(element);
		this.bubbleUp(this.heap.length - 1);
		return this;
	}

	/**
	 * Adds multiple elements to the queue.
	 *
	 * @param elements - Elements to add.
	 * @returns This queue, for chaining.
	 */
	enqueueAll(elements: T[]): this {
		for (const element of elements) {
			this.enqueue(element);
		}
		return this;
	}

	/**
	 * Removes and returns the highest-priority element.
	 *
	 * @returns The highest-priority element, or `undefined` if the queue is
	 *   empty.
	 */
	dequeue(): T | undefined {
		if (this.isEmpty) {
			return undefined;
		}

		const result = this.heap[0];
		const last = this.heap.pop();

		if (this.heap.length > 0 && last !== undefined) {
			this.heap[0] = last;
			this.bubbleDown(0);
		}

		return result;
	}

	/**
	 * Returns the highest-priority element without removing it.
	 *
	 * @returns The highest-priority element, or `undefined` if the queue is
	 *   empty.
	 */
	peek(): T | undefined {
		return this.heap[0];
	}

	/**
	 * Removes a specific element from the queue, wherever it sits in the heap.
	 *
	 * @param element - Element to remove.
	 * @param equalsFn - Equality predicate. Defaults to strict `===`.
	 * @returns `true` if the element was found and removed.
	 */
	remove(element: T, equalsFn?: (a: T, b: T) => boolean): boolean {
		const equals = equalsFn ?? ((a: T, b: T) => a === b);
		const index = this.heap.findIndex((item) => equals(item, element));

		if (index === -1) {
			return false;
		}

		this.removeAt(index);
		return true;
	}

	/**
	 * Updates an element's priority by removing it and re-inserting its
	 * replacement.
	 *
	 * @param oldElement - Element to replace.
	 * @param newElement - New element carrying the updated priority.
	 * @param equalsFn - Equality predicate used to locate `oldElement`.
	 * @returns `true` if the old element was found and updated.
	 */
	updatePriority(oldElement: T, newElement: T, equalsFn?: (a: T, b: T) => boolean): boolean {
		if (this.remove(oldElement, equalsFn)) {
			this.enqueue(newElement);
			return true;
		}
		return false;
	}

	/**
	 * Checks whether an element exists in the queue. Linear scan, `O(n)`.
	 *
	 * @param element - Element to find.
	 * @param equalsFn - Equality predicate. Defaults to strict `===`.
	 * @returns `true` if a matching element exists.
	 */
	contains(element: T, equalsFn?: (a: T, b: T) => boolean): boolean {
		const equals = equalsFn ?? ((a: T, b: T) => a === b);
		return this.heap.some((item) => equals(item, element));
	}

	/**
	 * Removes and returns all elements in priority order, emptying the queue.
	 *
	 * @returns The elements in priority order.
	 */
	drain(): T[] {
		const result: T[] = [];
		while (!this.isEmpty) {
			const item = this.dequeue();
			if (item !== undefined) {
				result.push(item);
			}
		}
		return result;
	}

	/**
	 * Returns a shallow copy of the elements without draining the queue.
	 *
	 * The order reflects internal heap layout and is **not** priority order —
	 * use {@link PriorityQueue.toSortedArray} when order matters.
	 *
	 * @returns A copy of the internal array.
	 */
	toArray(): T[] {
		return [...this.heap];
	}

	/**
	 * Returns the elements in priority order without modifying the queue.
	 *
	 * @returns The elements in priority order.
	 */
	toSortedArray(): T[] {
		const copy = [...this.heap];
		return copy.sort(this.compare);
	}

	/**
	 * Removes all elements from the queue.
	 */
	clear(): void {
		this.heap.length = 0;
	}

	/**
	 * Snapshot of queue statistics (size, capacity, emptiness).
	 *
	 * @returns The current {@link PriorityQueueStats}.
	 */
	getStats(): PriorityQueueStats {
		return {
			size: this.heap.length,
			capacity: this.heap.length, // JS arrays are dynamic
			isEmpty: this.isEmpty,
		};
	}

	/**
	 * Creates a new priority queue pre-loaded with the given elements.
	 *
	 * @param elements - Initial elements.
	 * @param args - Queue options (a `compareFn` is required for non-comparable
	 *   element types; see {@link PQArgs}).
	 * @returns A new priority queue containing `elements`.
	 */
	static from<T>(elements: T[], ...args: PQArgs<T>): PriorityQueue<T> {
		const queue = new PriorityQueue<T>(...args);
		queue.enqueueAll(elements);
		return queue;
	}

	// Private heap helpers.

	private getParentIndex(index: number): number {
		return Math.floor((index - 1) / 2);
	}

	private getLeftChildIndex(index: number): number {
		return 2 * index + 1;
	}

	private getRightChildIndex(index: number): number {
		return 2 * index + 2;
	}

	private swap(i: number, j: number): void {
		const temp = this.heap[i];
		const itemJ = this.heap[j];
		if (temp !== undefined && itemJ !== undefined) {
			this.heap[i] = itemJ;
			this.heap[j] = temp;
		}
	}

	private bubbleUp(index: number): void {
		while (index > 0) {
			const parentIndex = this.getParentIndex(index);
			const current = this.heap[index];
			const parent = this.heap[parentIndex];

			if (current === undefined || parent === undefined) {
				break;
			}

			if (this.compare(current, parent) >= 0) {
				break;
			}

			this.swap(index, parentIndex);
			index = parentIndex;
		}
	}

	private bubbleDown(index: number): void {
		const length = this.heap.length;

		while (true) {
			const leftIndex = this.getLeftChildIndex(index);
			const rightIndex = this.getRightChildIndex(index);
			let smallest = index;

			const current = this.heap[index];
			const left = this.heap[leftIndex];
			const right = this.heap[rightIndex];
			const smallestEl = this.heap[smallest];

			if (current === undefined || smallestEl === undefined) {
				break;
			}

			if (leftIndex < length && left !== undefined && this.compare(left, smallestEl) < 0) {
				smallest = leftIndex;
			}

			const newSmallest = this.heap[smallest];
			if (
				rightIndex < length &&
				right !== undefined &&
				newSmallest !== undefined &&
				this.compare(right, newSmallest) < 0
			) {
				smallest = rightIndex;
			}

			if (smallest === index) {
				break;
			}

			this.swap(index, smallest);
			index = smallest;
		}
	}

	private removeAt(index: number): void {
		if (index === this.heap.length - 1) {
			this.heap.pop();
			return;
		}

		const last = this.heap.pop();
		if (last !== undefined && index < this.heap.length) {
			this.heap[index] = last;
			this.bubbleDown(index);
			this.bubbleUp(index);
		}
	}
}

//#endregion

//#region Factory Functions

/**
 * A schedulable request with a deadline and priority level, used by the
 * queue factory helpers below.
 */
export interface PriorityRequestItem {
	/** Request ID */
	id: string;
	/** Response deadline */
	deadline: Date;
	/** Priority level (1 = highest) */
	priority: number;
	/** Request status */
	status: string;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Creates a priority queue of {@link PriorityRequestItem}s ordered purely by
 * `deadline`, so the soonest deadline is dequeued first.
 *
 * @returns A deadline-ordered priority queue.
 */
export function createDeadlineQueue(): PriorityQueue<PriorityRequestItem> {
	return new PriorityQueue<PriorityRequestItem>({
		compareFn: (a, b) => a.deadline.getTime() - b.deadline.getTime(),
	});
}

/**
 * Creates a priority queue of {@link PriorityRequestItem}s ordered by
 * `priority` level (lower number = higher priority), breaking ties by earliest
 * `deadline`.
 *
 * @returns A priority-then-deadline ordered priority queue.
 */
export function createPriorityLevelQueue(): PriorityQueue<PriorityRequestItem> {
	return new PriorityQueue<PriorityRequestItem>({
		compareFn: (a, b) => {
			// First compare by priority level
			if (a.priority !== b.priority) {
				return a.priority - b.priority;
			}
			// Then by deadline
			return a.deadline.getTime() - b.deadline.getTime();
		},
	});
}

/**
 * Creates a max-heap priority queue (highest value = highest priority).
 *
 * For {@link Comparable} elements the ordering is derived automatically. For
 * non-comparable elements a `compareFn` is required (min-ordering semantics);
 * it is wrapped so the largest element sits at the head.
 *
 * @returns Max-heap priority queue
 */
export function createMaxHeap<T>(...args: PQArgs<T>): PriorityQueue<T> {
	const options: PriorityQueueOptions<T> = args[0] ?? {};
	const userCompare = options.compareFn;
	const compareFn: CompareFn<T> = userCompare
		? (a, b) => userCompare(b, a)
		: (a, b) => {
				if (typeof a === "number" && typeof b === "number") {
					return b - a; // Reverse for max-heap
				}
				return String(b).localeCompare(String(a));
			};
	return new PriorityQueue<T>({ ...options, compareFn });
}

/**
 * Creates a min-heap priority queue (lowest value = highest priority).
 *
 * For {@link Comparable} elements no options are required; for non-comparable
 * elements a `compareFn` is required (see {@link PQArgs}).
 *
 * @returns Min-heap priority queue
 */
export function createMinHeap<T>(...args: PQArgs<T>): PriorityQueue<T> {
	return new PriorityQueue<T>(...args);
}

/**
 * Validates and decodes a priority-item input object against its schema.
 *
 * @param input - Untrusted input to validate.
 * @returns The validated item with schema defaults applied, or `null` if the
 *   input is invalid.
 */
export function validatePriorityItem(input: unknown): PriorityItemInput | null {
	const result = validateSafe(PriorityItemSchema, input);
	return result.success ? result.data : null;
}
//#endregion
