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
 * @file Priority Queue Data Structure Tests
 * @module tests/dsa/priority-queue
 */

import { describe, expect, it } from "vitest";
import { PriorityQueue, validatePriorityItem } from "../src/priority-queue.js";

interface FOIARequest {
	id: string;
	deadline: Date;
	priority: number;
}

describe("PriorityQueue", () => {
	describe("constructor", () => {
		it("should create an empty min-heap by default", () => {
			const queue = new PriorityQueue<number>();
			expect(queue.size).toBe(0);
			expect(queue.isEmpty).toBe(true);
		});

		it("should create with custom initial capacity", () => {
			const queue = new PriorityQueue<number>({ initialCapacity: 100 });
			expect(queue.size).toBe(0);
		});

		it("should throw error for invalid initialCapacity", () => {
			expect(
				() => new PriorityQueue<number>({ initialCapacity: -1 }),
			).toThrow();
			expect(() => new PriorityQueue<number>({ initialCapacity: 0 })).toThrow();
		});

		it("should accept custom compare function", () => {
			const maxHeap = new PriorityQueue<number>({
				compareFn: (a, b) => b - a,
			});
			maxHeap.enqueue(1).enqueue(5).enqueue(3);
			expect(maxHeap.peek()).toBe(5);
		});
	});

	describe("enqueue", () => {
		it("should add element to the queue", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5);
			expect(queue.size).toBe(1);
			expect(queue.isEmpty).toBe(false);
		});

		it("should maintain min-heap property", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5).enqueue(3).enqueue(7).enqueue(1);
			expect(queue.peek()).toBe(1);
		});

		it("should support method chaining", () => {
			const queue = new PriorityQueue<number>();
			const result = queue.enqueue(1).enqueue(2).enqueue(3);
			expect(result).toBe(queue);
			expect(queue.size).toBe(3);
		});
	});

	describe("enqueueAll", () => {
		it("should add multiple elements", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueueAll([5, 3, 7, 1, 9]);
			expect(queue.size).toBe(5);
			expect(queue.peek()).toBe(1);
		});
	});

	describe("dequeue", () => {
		it("should return undefined for empty queue", () => {
			const queue = new PriorityQueue<number>();
			expect(queue.dequeue()).toBeUndefined();
		});

		it("should remove and return highest priority element (min)", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5).enqueue(3).enqueue(7).enqueue(1);
			expect(queue.dequeue()).toBe(1);
			expect(queue.dequeue()).toBe(3);
			expect(queue.dequeue()).toBe(5);
			expect(queue.dequeue()).toBe(7);
		});

		it("should work with max-heap", () => {
			const queue = new PriorityQueue<number>({
				compareFn: (a, b) => b - a,
			});
			queue.enqueue(5).enqueue(3).enqueue(7).enqueue(1);
			expect(queue.dequeue()).toBe(7);
			expect(queue.dequeue()).toBe(5);
		});
	});

	describe("peek", () => {
		it("should return undefined for empty queue", () => {
			const queue = new PriorityQueue<number>();
			expect(queue.peek()).toBeUndefined();
		});

		it("should return highest priority element without removing", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5).enqueue(3).enqueue(7);
			expect(queue.peek()).toBe(3);
			expect(queue.size).toBe(3);
		});
	});

	describe("remove", () => {
		it("should remove specific element", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5).enqueue(3).enqueue(7);
			expect(queue.remove(5)).toBe(true);
			expect(queue.size).toBe(2);
			expect(queue.contains(5)).toBe(false);
		});

		it("should return false for non-existent element", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5);
			expect(queue.remove(10)).toBe(false);
		});

		it("should use custom equality function", () => {
			const queue = new PriorityQueue<FOIARequest>({
				compareFn: (a, b) => a.priority - b.priority,
			});
			const req1: FOIARequest = { id: "1", deadline: new Date(), priority: 1 };
			const req2: FOIARequest = { id: "2", deadline: new Date(), priority: 2 };
			queue.enqueue(req1).enqueue(req2);

			const result = queue.remove(req1, (a, b) => a.id === b.id);
			expect(result).toBe(true);
			expect(queue.size).toBe(1);
		});
	});

	describe("updatePriority", () => {
		it("should update element priority", () => {
			const queue = new PriorityQueue<FOIARequest>({
				compareFn: (a, b) => a.priority - b.priority,
			});
			const req1: FOIARequest = { id: "1", deadline: new Date(), priority: 2 };
			const req2: FOIARequest = { id: "2", deadline: new Date(), priority: 3 };
			queue.enqueue(req1).enqueue(req2);

			const updated: FOIARequest = { ...req2, priority: 1 };
			const result = queue.updatePriority(
				req2,
				updated,
				(a, b) => a.id === b.id,
			);
			expect(result).toBe(true);
			expect(queue.peek()?.id).toBe("2");
		});

		it("should return false for non-existent element", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(1);
			expect(queue.updatePriority(5, 10)).toBe(false);
		});
	});

	describe("contains", () => {
		it("should return true for existing element", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5);
			expect(queue.contains(5)).toBe(true);
		});

		it("should return false for non-existent element", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueue(5);
			expect(queue.contains(10)).toBe(false);
		});
	});

	describe("drain", () => {
		it("should return elements in priority order and empty queue", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueueAll([5, 3, 7, 1, 9]);
			const drained = queue.drain();
			expect(drained).toEqual([1, 3, 5, 7, 9]);
			expect(queue.isEmpty).toBe(true);
		});
	});

	describe("toArray", () => {
		it("should return array copy without draining", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueueAll([5, 3, 7]);
			const arr = queue.toArray();
			expect(arr.length).toBe(3);
			expect(queue.size).toBe(3);
		});
	});

	describe("toSortedArray", () => {
		it("should return sorted array without modifying queue", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueueAll([5, 3, 7, 1]);
			const sorted = queue.toSortedArray();
			expect(sorted).toEqual([1, 3, 5, 7]);
			expect(queue.size).toBe(4);
		});
	});

	describe("clear", () => {
		it("should remove all elements", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueueAll([1, 2, 3]);
			queue.clear();
			expect(queue.isEmpty).toBe(true);
			expect(queue.size).toBe(0);
		});
	});

	describe("getStats", () => {
		it("should return queue statistics", () => {
			const queue = new PriorityQueue<number>();
			queue.enqueueAll([1, 2, 3]);
			const stats = queue.getStats();
			expect(stats.size).toBe(3);
			expect(stats.isEmpty).toBe(false);
		});
	});

	describe("static from", () => {
		it("should create queue from array", () => {
			const queue = PriorityQueue.from([5, 3, 7, 1]);
			expect(queue.size).toBe(4);
			expect(queue.peek()).toBe(1);
		});

		it("should accept options", () => {
			const queue = PriorityQueue.from([5, 3, 7, 1], {
				compareFn: (a, b) => b - a,
			});
			expect(queue.peek()).toBe(7);
		});
	});

	describe("Request scheduling", () => {
		it("should prioritize by deadline", () => {
			const queue = new PriorityQueue<FOIARequest>({
				compareFn: (a, b) => a.deadline.getTime() - b.deadline.getTime(),
			});

			const req1: FOIARequest = {
				id: "1",
				deadline: new Date("2025-03-15"),
				priority: 1,
			};
			const req2: FOIARequest = {
				id: "2",
				deadline: new Date("2025-03-10"),
				priority: 2,
			};
			const req3: FOIARequest = {
				id: "3",
				deadline: new Date("2025-03-20"),
				priority: 3,
			};

			queue.enqueue(req1).enqueue(req2).enqueue(req3);

			expect(queue.dequeue()?.id).toBe("2"); // earliest deadline
			expect(queue.dequeue()?.id).toBe("1");
			expect(queue.dequeue()?.id).toBe("3");
		});
	});
});

describe("validatePriorityItem", () => {
	it("should validate valid priority item", () => {
		const item = {
			id: "test-123",
			priority: 5,
			dueDate: "2025-03-15T00:00:00.000Z",
		};
		const result = validatePriorityItem(item);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("test-123");
		expect(result?.priority).toBe(5);
	});

	it("should reject invalid priority", () => {
		const item = {
			id: "test-123",
			priority: -1,
			dueDate: "2025-03-15T00:00:00.000Z",
		};
		const result = validatePriorityItem(item);
		expect(result).toBeNull();
	});

	it("should reject empty id", () => {
		const item = {
			id: "",
			priority: 5,
			dueDate: "2025-03-15T00:00:00.000Z",
		};
		const result = validatePriorityItem(item);
		expect(result).toBeNull();
	});

	it("should use default priority when not provided", () => {
		const item = {
			id: "test-123",
			dueDate: "2025-03-15T00:00:00.000Z",
		};
		const result = validatePriorityItem(item);
		expect(result).not.toBeNull();
		expect(result?.priority).toBe(3); // default priority
	});
});
