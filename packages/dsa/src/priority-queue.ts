/**
 * Copyright 2026 ResQ Software
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
 * @file Priority Queue (Binary Heap) Data Structure
 * @module dsa/priority-queue
 * @description Min/Max heap implementation for deadline-based, numeric, or custom priority ordering.
 */

import {
	PriorityItemSchema,
	PriorityQueueOptionsSchema,
	type PriorityItemInput,
	validateSafe,
} from "./schemas.js";

// ============================================
// Types & Interfaces
// ============================================

/**
 * Comparison function for priority queue ordering
 * Returns negative if a has higher priority, positive if b has higher priority, 0 if equal
 */
export type CompareFn<T> = (a: T, b: T) => number;

/**
 * Options for priority queue configuration
 */
export interface PriorityQueueOptions<T> {
	/** Custom comparison function (default: min-heap with numeric comparison) */
	compareFn?: CompareFn<T>;
	/** Initial capacity for the underlying array */
	initialCapacity?: number;
}

/**
 * Priority queue statistics
 */
export interface PriorityQueueStats {
	/** Current number of elements */
	size: number;
	/** Current capacity of underlying array */
	capacity: number;
	/** Whether the queue is empty */
	isEmpty: boolean;
}

// ============================================
// Priority Queue Implementation
// ============================================

/**
 * Priority Queue implemented as a Binary Heap
 *
 * By default, this is a min-heap where the smallest element has highest priority.
 * Use a custom compareFn for max-heap or custom ordering.
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
 * ```typescript
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
	 * Creates a new Priority Queue
	 * @param options - Configuration options
	 * @throws Error if options validation fails
	 */
	constructor(options: PriorityQueueOptions<T> = {}) {
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
	 * Returns the number of elements in the queue
	 */
	get size(): number {
		return this.heap.length;
	}

	/**
	 * Checks if the queue is empty
	 */
	get isEmpty(): boolean {
		return this.heap.length === 0;
	}

	/**
	 * Adds an element to the queue
	 *
	 * @param element - Element to add
	 * @returns This queue for chaining
	 */
	enqueue(element: T): this {
		this.heap.push(element);
		this.bubbleUp(this.heap.length - 1);
		return this;
	}

	/**
	 * Adds multiple elements to the queue
	 *
	 * @param elements - Elements to add
	 * @returns This queue for chaining
	 */
	enqueueAll(elements: T[]): this {
		for (const element of elements) {
			this.enqueue(element);
		}
		return this;
	}

	/**
	 * Removes and returns the highest priority element
	 *
	 * @returns The highest priority element or undefined if empty
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
	 * Returns the highest priority element without removing it
	 *
	 * @returns The highest priority element or undefined if empty
	 */
	peek(): T | undefined {
		return this.heap[0];
	}

	/**
	 * Removes a specific element from the queue
	 *
	 * @param element - Element to remove
	 * @param equalsFn - Optional equality function (default: strict equality)
	 * @returns True if the element was found and removed
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
	 * Updates an element's priority by removing and re-adding it
	 *
	 * @param oldElement - Element to update
	 * @param newElement - New element with updated priority
	 * @param equalsFn - Optional equality function
	 * @returns True if the element was found and updated
	 */
	updatePriority(
		oldElement: T,
		newElement: T,
		equalsFn?: (a: T, b: T) => boolean,
	): boolean {
		if (this.remove(oldElement, equalsFn)) {
			this.enqueue(newElement);
			return true;
		}
		return false;
	}

	/**
	 * Checks if an element exists in the queue
	 *
	 * @param element - Element to find
	 * @param equalsFn - Optional equality function
	 * @returns True if the element exists
	 */
	contains(element: T, equalsFn?: (a: T, b: T) => boolean): boolean {
		const equals = equalsFn ?? ((a: T, b: T) => a === b);
		return this.heap.some((item) => equals(item, element));
	}

	/**
	 * Returns all elements in priority order (drains the queue)
	 *
	 * @returns Array of elements in priority order
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
	 * Returns all elements as an array (does not drain)
	 * Note: Order is not guaranteed to be in priority order
	 *
	 * @returns Copy of internal array
	 */
	toArray(): T[] {
		return [...this.heap];
	}

	/**
	 * Returns elements in priority order without modifying the queue
	 *
	 * @returns Array of elements in priority order
	 */
	toSortedArray(): T[] {
		const copy = [...this.heap];
		return copy.sort(this.compare);
	}

	/**
	 * Clears all elements from the queue
	 */
	clear(): void {
		this.heap.length = 0;
	}

	/**
	 * Gets queue statistics
	 *
	 * @returns Queue statistics
	 */
	getStats(): PriorityQueueStats {
		return {
			size: this.heap.length,
			capacity: this.heap.length, // JS arrays are dynamic
			isEmpty: this.isEmpty,
		};
	}

	/**
	 * Creates a new priority queue from an array
	 *
	 * @param elements - Elements to add
	 * @param options - Queue options
	 * @returns New priority queue with elements
	 */
	static from<T>(
		elements: T[],
		options: PriorityQueueOptions<T> = {},
	): PriorityQueue<T> {
		const queue = new PriorityQueue<T>(options);
		queue.enqueueAll(elements);
		return queue;
	}

	// ============================================
	// Private Helper Methods
	// ============================================

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

			if (
				leftIndex < length &&
				left !== undefined &&
				this.compare(left, smallestEl) < 0
			) {
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

// ============================================
// Factory Functions
// ============================================

/**
 * Priority request item
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

export function createDeadlineQueue(): PriorityQueue<PriorityRequestItem> {
	return new PriorityQueue<PriorityRequestItem>({
		compareFn: (a, b) => a.deadline.getTime() - b.deadline.getTime(),
	});
}

/**
 * Creates a priority queue ordered by priority level
 * Lower priority number = higher priority
 *
 * @returns Priority queue that prioritizes by priority level, then deadline
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
 * Creates a max-heap priority queue (highest value = highest priority)
 *
 * @returns Max-heap priority queue
 */
export function createMaxHeap<T>(): PriorityQueue<T> {
	return new PriorityQueue<T>({
		compareFn: (a, b) => {
			if (typeof a === "number" && typeof b === "number") {
				return b - a; // Reverse for max-heap
			}
			return String(b).localeCompare(String(a));
		},
	});
}

/**
 * Creates a min-heap priority queue (lowest value = highest priority)
 *
 * @returns Min-heap priority queue
 */
export function createMinHeap<T>(): PriorityQueue<T> {
	return new PriorityQueue<T>();
}

/**
 * Validates a priority item input object
 * @returns Validated item with defaults applied, or null if invalid
 */
export function validatePriorityItem(input: unknown): PriorityItemInput | null {
	const result = validateSafe(PriorityItemSchema, input);
	return result.success ? (result.data as PriorityItemInput) : null;
}
