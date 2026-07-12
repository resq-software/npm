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
 * @file Type-level regression tests
 * @module tests/dsa/type-safety
 * @description Compile-time assertions verified by `vitest --typecheck`. These
 *              guard the breaking type-safety upgrades: the formula-derived point
 *              shape in `Distance.calculate` and the conditionally-required
 *              `compareFn` on `PriorityQueue`.
 */

import { expectTypeOf, test } from "vitest";
import type { Coordinates2D, Coordinates3D } from "../src/distance.js";
import { Distance } from "../src/distance.js";
import { PriorityQueue, createMinHeap } from "../src/priority-queue.js";

const p2d: Coordinates2D = { lat: 0, lng: 0 };
const p3d: Coordinates3D = { lat: 0, lng: 0, alt: 5 };

interface Task {
	id: string;
	severity: number;
}

test("Distance.calculate derives the required point shape from the formula", () => {
	// 'threed' requires 3D points on both arguments.
	expectTypeOf(Distance.calculate("threed", p3d, p3d)).toBeNumber();

	// @ts-expect-error — 'threed' rejects 2D points (missing `alt`).
	Distance.calculate("threed", p2d, p2d);

	// @ts-expect-error — second 'threed' argument must be 3D too.
	Distance.calculate("threed", p3d, p2d);

	// 2D formulas accept 2D points, and 3D points remain assignable to 2D.
	expectTypeOf(Distance.calculate("euclidean", p2d, p2d)).toBeNumber();
	expectTypeOf(Distance.calculate("haversine", p3d, p3d)).toBeNumber();
});

test("PriorityQueue requires a compareFn for non-comparable element types", () => {
	// Comparable elements need no comparator.
	expectTypeOf(new PriorityQueue<number>()).toEqualTypeOf<PriorityQueue<number>>();
	expectTypeOf(createMinHeap<string>()).toEqualTypeOf<PriorityQueue<string>>();

	// Object elements require an explicit comparator.
	const queue = new PriorityQueue<Task>({ compareFn: (a, b) => a.severity - b.severity });
	expectTypeOf(queue).toEqualTypeOf<PriorityQueue<Task>>();

	// @ts-expect-error — object element type with no comparator is rejected.
	new PriorityQueue<Task>();

	// @ts-expect-error — factory rejects the same missing-comparator case.
	createMinHeap<Task>();

	// @ts-expect-error — an options object without `compareFn` is still rejected.
	new PriorityQueue<Task>({ initialCapacity: 8 });
});
