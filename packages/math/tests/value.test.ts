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
import {
	num,
	mkSet,
	bool,
	record,
	asNum,
	asSet,
	asBool,
	asRecord,
	showValue,
	setEq,
} from "../src/value.js";
import { SortError } from "../src/error.js";

describe("Value System", () => {
	it("constructs correctly tagged values", () => {
		expect(num(42)).toEqual({ sort: "num", value: 42, category: "prvalue" });
		expect(mkSet([1, 2, 3])).toEqual({
			sort: "set",
			value: new Set([1, 2, 3]),
			category: "prvalue",
		});
		expect(bool(true)).toEqual({ sort: "bool", value: true, category: "prvalue" });
		expect(record({ a: num(1) })).toEqual({
			sort: "record",
			value: { a: num(1) },
			category: "prvalue",
		});
	});

	it("extracts values safely or throws SortError", () => {
		const n = num(42);
		const s = mkSet([1, 2]);
		const b = bool(true);
		const r = record({ x: num(1) });

		expect(asNum(n)).toBe(42);
		expect(() => asNum(s)).toThrow(SortError);
		expect(() => asNum(b)).toThrow(SortError);
		expect(() => asNum(r)).toThrow(SortError);

		expect(asSet(s)).toEqual(new Set([1, 2]));
		expect(() => asSet(n)).toThrow(SortError);
		expect(() => asSet(b)).toThrow(SortError);
		expect(() => asSet(r)).toThrow(SortError);

		expect(asBool(b)).toBe(true);
		expect(() => asBool(n)).toThrow(SortError);
		expect(() => asBool(s)).toThrow(SortError);
		expect(() => asBool(r)).toThrow(SortError);

		expect(asRecord(r)).toEqual({ x: num(1) });
		expect(() => asRecord(n)).toThrow(SortError);
		expect(() => asRecord(s)).toThrow(SortError);
		expect(() => asRecord(b)).toThrow(SortError);
	});

	it("shows values formatted correctly", () => {
		expect(showValue(num(42))).toBe("42");
		expect(showValue(num(-0))).toBe("-0");
		expect(showValue(bool(true))).toBe("true");
		expect(showValue(bool(false))).toBe("false");
		expect(showValue(mkSet([]))).toBe("∅");
		expect(showValue(mkSet([1, 2, 3]))).toBe("{1, 2, 3}");
		expect(showValue(record({ a: num(1), b: bool(false) }))).toBe("{a: 1, b: false}");
	});

	it("checks set equality", () => {
		const s1 = new Set([1, 2, 3]);
		const s2 = new Set([1, 2, 3]);
		const s3 = new Set([1, 2]);
		const s4 = new Set([1, 2, 4]);

		expect(setEq(s1, s2)).toBe(true);
		expect(setEq(s1, s3)).toBe(false);
		expect(setEq(s1, s4)).toBe(false);
	});
});
