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
import { BoundedHeap } from "../src/heap.js";

type Entry = { id: string; distance: number };

describe("BoundedHeap", () => {
	describe("retention semantics", () => {
		it("keeps the K nearest (smallest distance) entries", () => {
			const heap = new BoundedHeap<Entry>(3);
			heap.insert({ id: "a", distance: 10 });
			heap.insert({ id: "b", distance: 2 });
			heap.insert({ id: "c", distance: 7 });
			heap.insert({ id: "d", distance: 1 }); // evicts 'a' (dist 10)
			heap.insert({ id: "e", distance: 50 }); // rejected — larger than root

			expect(heap.size).toBe(3);
			const sorted = heap.toSorted();
			expect(sorted.map((x) => x.id)).toEqual(["d", "b", "c"]); // ascending distance
		});

		it("peek returns the current maximum", () => {
			const heap = new BoundedHeap<Entry>(2);
			heap.insert({ id: "x", distance: 5 });
			heap.insert({ id: "y", distance: 3 });
			expect(heap.peek()?.id).toBe("x"); // max-heap root = largest distance
		});

		it("handles limit=1", () => {
			const heap = new BoundedHeap<Entry>(1);
			heap.insert({ id: "a", distance: 9 });
			heap.insert({ id: "b", distance: 3 });
			expect(heap.size).toBe(1);
			expect(heap.peek()?.id).toBe("b");
		});

		it("retains all inserts when below capacity", () => {
			const heap = new BoundedHeap<Entry>(5);
			heap.insert({ id: "a", distance: 3 });
			heap.insert({ id: "b", distance: 1 });
			heap.insert({ id: "c", distance: 2 });
			expect(heap.size).toBe(3);
			expect(heap.toSorted().map((x) => x.id)).toEqual(["b", "c", "a"]);
		});

		it("does not evict on equal-to-max insert (strict less-than only)", () => {
			const heap = new BoundedHeap<Entry>(2);
			heap.insert({ id: "a", distance: 5 });
			heap.insert({ id: "b", distance: 5 });
			heap.insert({ id: "c", distance: 5 }); // 5 < 5 is false → rejected
			expect(heap.size).toBe(2);
		});

		it("tracks size correctly through fill, eviction, and rejection", () => {
			const heap = new BoundedHeap<Entry>(3);
			expect(heap.size).toBe(0);
			heap.insert({ id: "a", distance: 1 });
			expect(heap.size).toBe(1);
			heap.insert({ id: "b", distance: 2 });
			heap.insert({ id: "c", distance: 3 });
			expect(heap.size).toBe(3);
			heap.insert({ id: "d", distance: 0 }); // eviction, size stays at 3
			expect(heap.size).toBe(3);
			heap.insert({ id: "e", distance: 99 }); // rejection, size stays at 3
			expect(heap.size).toBe(3);
		});
	});

	describe("empty heap", () => {
		it("size is 0 on construction", () => {
			const heap = new BoundedHeap<Entry>(5);
			expect(heap.size).toBe(0);
		});

		it("peek returns undefined when empty", () => {
			const heap = new BoundedHeap<Entry>(5);
			expect(heap.peek()).toBeUndefined();
		});

		it("toSorted returns empty array when empty", () => {
			const heap = new BoundedHeap<Entry>(5);
			expect(heap.toSorted()).toEqual([]);
		});
	});

	describe("toSorted", () => {
		it("returns ascending order by distance", () => {
			const heap = new BoundedHeap<Entry>(5);
			[7, 1, 5, 3, 9].forEach((d, i) => heap.insert({ id: `${i}`, distance: d }));
			const sorted = heap.toSorted();
			expect(sorted.map((x) => x.distance)).toEqual([1, 3, 5, 7, 9]);
		});

		it("does not mutate the heap", () => {
			const heap = new BoundedHeap<Entry>(3);
			heap.insert({ id: "a", distance: 5 });
			heap.insert({ id: "b", distance: 1 });
			heap.insert({ id: "c", distance: 3 });
			const sizeBefore = heap.size;
			const peekBefore = heap.peek();
			heap.toSorted();
			heap.toSorted();
			expect(heap.size).toBe(sizeBefore);
			expect(heap.peek()).toEqual(peekBefore);
		});

		it("returns a fresh array on each call", () => {
			const heap = new BoundedHeap<Entry>(3);
			heap.insert({ id: "a", distance: 1 });
			const a = heap.toSorted();
			const b = heap.toSorted();
			expect(a).not.toBe(b);
			expect(a).toEqual(b);
		});
	});

	describe("limit edge cases", () => {
		it("limit=2 keeps the two smallest from many inserts", () => {
			const heap = new BoundedHeap<Entry>(2);
			[10, 3, 8, 1, 6, 2, 9].forEach((d, i) => heap.insert({ id: `${i}`, distance: d }));
			expect(heap.toSorted().map((x) => x.distance)).toEqual([1, 2]);
		});

		it("scales: top-10 from 10 000 random inserts", () => {
			const heap = new BoundedHeap<Entry>(10);
			for (let i = 0; i < 10_000; i++) {
				heap.insert({ id: `${i}`, distance: Math.random() });
			}
			const sorted = heap.toSorted();
			expect(sorted.length).toBe(10);
			// Sorted ascending — every adjacent pair satisfies the order.
			for (let i = 1; i < sorted.length; i++) {
				expect(sorted[i]!.distance).toBeGreaterThanOrEqual(sorted[i - 1]!.distance);
			}
		});
	});

	describe("limit field", () => {
		it("exposes the configured limit", () => {
			const heap = new BoundedHeap<Entry>(7);
			expect(heap.limit).toBe(7);
		});
	});
});
