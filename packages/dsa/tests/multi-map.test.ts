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
import { MultiMap } from "../src/multi-map.js";

describe("MultiMap", () => {
	it("appends values under a key instead of overwriting", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.set("a", 2);
		map.set("b", 3);
		expect(map.get("a")).toEqual([1, 2]);
		expect(map.get("b")).toEqual([3]);
	});

	it("returns an empty array for an unknown key", () => {
		const map = new MultiMap<string, number>();
		expect(map.get("missing")).toEqual([]);
		expect(map.has("missing")).toBe(false);
	});

	it("reports membership by key and by value", () => {
		const map = new MultiMap<string, string>();
		map.set("zone", "drone-1");
		expect(map.has("zone")).toBe(true);
		expect(map.hasValue("zone", "drone-1")).toBe(true);
		expect(map.hasValue("zone", "drone-9")).toBe(false);
		expect(map.hasValue("other", "drone-1")).toBe(false);
	});

	it("deletes a single value while keeping the rest", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.set("a", 2);
		map.delete("a", 1);
		expect(map.get("a")).toEqual([2]);
		expect(map.has("a")).toBe(true);
	});

	it("drops the key once its last value is deleted", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.delete("a", 1);
		expect(map.has("a")).toBe(false);
		expect(map.size).toBe(0);
	});

	it("removes every occurrence of a repeated value on delete", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.set("a", 1);
		map.set("a", 2);
		map.delete("a", 1);
		expect(map.get("a")).toEqual([2]);
	});

	it("is a no-op when deleting from an unknown key", () => {
		const map = new MultiMap<string, number>();
		expect(() => map.delete("missing", 1)).not.toThrow();
		expect(map.size).toBe(0);
	});

	it("deleteAll removes the key and all its values", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.set("a", 2);
		map.deleteAll("a");
		expect(map.has("a")).toBe(false);
		expect(map.get("a")).toEqual([]);
	});

	it("tracks the number of distinct keys via size", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.set("a", 2);
		map.set("b", 3);
		expect(map.size).toBe(2);
	});

	it("iterates [key, values] entries", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.set("a", 2);
		map.set("b", 3);
		expect([...map]).toEqual([
			["a", [1, 2]],
			["b", [3]],
		]);
		expect([...map.keys()]).toEqual(["a", "b"]);
	});

	it("flattens every value across keys via values()", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.set("a", 2);
		map.set("b", 3);
		expect(map.values()).toEqual([1, 2, 3]);
	});

	it("clear() empties the map", () => {
		const map = new MultiMap<string, number>();
		map.set("a", 1);
		map.clear();
		expect(map.size).toBe(0);
		expect(map.has("a")).toBe(false);
	});
});
