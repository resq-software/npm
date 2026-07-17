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
 * @fileoverview Fixed-capacity max-heap that retains the N smallest items by
 * `distance` — a top-K nearest-neighbour primitive in O(N) memory.
 *
 * @module @resq-systems/dsa/heap
 */

/**
 * Anything with a numeric `distance` field — the only constraint
 * {@link BoundedHeap} places on its elements.
 */
export interface Distanced {
	distance: number;
}

/**
 * Fixed-capacity max-heap that keeps the **N smallest** items by `distance`.
 *
 * Designed for top-K nearest-neighbour use: insert `M` candidates, retrieve
 * the `N` closest in `O(M log N)` total time and `O(N)` memory regardless of
 * how many candidates are scanned.
 *
 * Internally a max-heap on `distance`, so the *largest* distance among the
 * kept N sits at the root. New entries are accepted only when they are
 * strictly closer than the current worst.
 *
 * @template T - Element type; must expose a numeric `distance` field.
 *
 * @example Keep the 5 nearest survey points
 * ```ts
 * const top5 = new BoundedHeap<{ id: string; distance: number }>(5);
 * for (const p of points) top5.insert(p);
 * const nearest = top5.toSorted(); // ascending by distance
 * ```
 */
export class BoundedHeap<T extends Distanced> {
	readonly #data: T[] = [];

	/** Maximum number of elements the heap will retain. */
	readonly limit: number;

	/**
	 * @param limit - Maximum number of items to retain. Once full, new
	 *   inserts are accepted only when their `distance` is strictly less
	 *   than the current worst-kept element's distance. A non-positive
	 *   `limit` yields a heap that retains nothing — every {@link insert} is a
	 *   no-op.
	 */
	constructor(limit: number) {
		this.limit = limit;
	}

	/**
	 * Insert a candidate. If the heap is below capacity, the entry is added
	 * unconditionally. Otherwise the entry replaces the current worst-kept
	 * element if and only if `entry.distance < currentWorst.distance`.
	 *
	 * Time complexity: `O(log limit)`.
	 */
	insert(entry: T): void {
		if (this.#data.length < this.limit) {
			this.#data.push(entry);
			this.#siftUp(this.#data.length - 1);
		} else if (this.#data.length > 0 && entry.distance < this.#data[0]!.distance) {
			this.#data[0] = entry;
			this.#siftDown(0);
		}
	}

	/**
	 * @returns The element with the **largest** retained distance, or
	 *   `undefined` if the heap is empty. This is the entry that would be
	 *   evicted next on a closer insert.
	 */
	peek(): T | undefined {
		return this.#data[0];
	}

	/**
	 * @returns A new array of the retained entries sorted ascending by
	 *   `distance` (nearest first). Does not mutate the heap.
	 */
	toSorted(): T[] {
		return [...this.#data].sort((a, b) => a.distance - b.distance);
	}

	/** Current number of retained elements (≤ `limit`). */
	get size(): number {
		return this.#data.length;
	}

	#siftUp(i: number): void {
		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (this.#data[parent]!.distance >= this.#data[i]!.distance) break;
			[this.#data[parent], this.#data[i]] = [this.#data[i]!, this.#data[parent]!];
			i = parent;
		}
	}

	#siftDown(i: number): void {
		const n = this.#data.length;
		while (true) {
			let largest = i;
			const l = 2 * i + 1;
			const r = 2 * i + 2;
			if (l < n && this.#data[l]!.distance > this.#data[largest]!.distance) largest = l;
			if (r < n && this.#data[r]!.distance > this.#data[largest]!.distance) largest = r;
			if (largest === i) break;
			[this.#data[i], this.#data[largest]] = [this.#data[largest]!, this.#data[i]!];
			i = largest;
		}
	}
}
