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
 * @fileoverview Sort-tagged value system for the math expression engine.
 *
 * Values are the runtime representation of computed results. Each carries a
 * `sort` discriminant (`"num"`, `"set"`, `"bool"`, `"func"`) that the evaluator
 * uses to select the correct type-class instance for each operator.
 *
 * @module @resq-systems/math/value
 */

import { assertNever } from "./_assert.js";
import { SortError } from "./error.js";

//#region Types

/**
 * Value-category tag borrowed from C++ terminology: `prvalue` for freshly
 * computed results and `lvalue` for addressable operands. Purely advisory
 * metadata carried on {@link Value} — the evaluator never reads it, so it does
 * not affect any result. Every constructor here stamps `"prvalue"`.
 */
export type ValueCategory = "lvalue" | "prvalue";

/**
 * A tagged runtime value, the output of evaluation. `sort` is the discriminant:
 * it selects which remaining fields are present and which operator instances the
 * evaluator dispatches to.
 *
 * - `"num"`, `"bool"`, and `"record"` carry a matching `value` payload; `"set"`
 *   carries a `ReadonlySet<number>` (finite integer sets only).
 * - `"func"` is the exception — it has no `value`. It carries a compiled `body`
 *   plus the `closure` (the lexical value stack captured where the lambda was
 *   evaluated); the two together *are* the function. See {@link func} and
 *   {@link asFunc}.
 *
 * All payloads are deeply `readonly`; `category` is optional advisory metadata
 * (see {@link ValueCategory}).
 */
export type Value = (
	| { readonly sort: "num"; readonly value: number }
	| { readonly sort: "set"; readonly value: ReadonlySet<number> }
	| { readonly sort: "bool"; readonly value: boolean }
	| {
			readonly sort: "func";
			readonly body: import("./ast.js").CompiledExpr;
			readonly closure: readonly Value[];
	  }
	| { readonly sort: "record"; readonly value: Readonly<Record<string, Value>> }
) & { readonly category?: ValueCategory };

/** The discriminant tag of a {@link Value}. */
export type Sort = Value["sort"];

//#endregion

//#region Constructors

/** Wrap a JS number as a `num`-sorted value. */
export const num = (n: number): Value => ({ sort: "num", value: n, category: "prvalue" });

/**
 * Wrap an iterable of numbers as a `set`-sorted value.
 *
 * Copies `xs` into a fresh `Set`, so the value is a snapshot: later mutation of
 * the source is not observable through it, and duplicate elements collapse.
 */
export const mkSet = (xs: Iterable<number>): Value => ({
	sort: "set",
	value: new Set(xs),
	category: "prvalue",
});

/** Wrap a JS boolean as a `bool`-sorted value. */
export const bool = (b: boolean): Value => ({ sort: "bool", value: b, category: "prvalue" });

/** Wrap a body and closure as a `func`-sorted value. */
export const func = (body: import("./ast.js").CompiledExpr, closure: readonly Value[]): Value => ({
	sort: "func",
	body,
	closure,
	category: "prvalue",
});

/**
 * Wrap a JS record as a `record`-sorted value.
 *
 * Stores `val` by reference — unlike {@link mkSet}, it does not copy or freeze —
 * so the caller retains ownership and any later mutation of `val` is visible
 * through the returned value. Pass a fresh object if you need isolation.
 */
export const record = (val: Record<string, Value>): Value => ({
	sort: "record",
	value: val,
	category: "prvalue",
});

//#endregion

//#region Extractors

/**
 * Extract the `number` from a `num` value, or throw {@link SortError}.
 *
 * @param v - The value to unwrap.
 * @param context - Optional description for the error message (e.g. operator name).
 * @returns The wrapped number.
 * @throws {SortError} If `v` is not `num`-sorted.
 */
export const asNum = (v: Value, context?: string): number => {
	if (v.sort !== "num") throw new SortError("num", v.sort, context);
	return v.value;
};

/**
 * Extract the `ReadonlySet<number>` from a `set` value, or throw {@link SortError}.
 *
 * @param v - The value to unwrap.
 * @param context - Optional description for the error message.
 * @returns The wrapped set.
 * @throws {SortError} If `v` is not `set`-sorted.
 */
export const asSet = (v: Value, context?: string): ReadonlySet<number> => {
	if (v.sort !== "set") throw new SortError("set", v.sort, context);
	return v.value;
};

/**
 * Extract the `boolean` from a `bool` value, or throw {@link SortError}.
 *
 * @param v - The value to unwrap.
 * @param context - Optional description for the error message.
 * @returns The wrapped boolean.
 * @throws {SortError} If `v` is not `bool`-sorted.
 */
export const asBool = (v: Value, context?: string): boolean => {
	if (v.sort !== "bool") throw new SortError("bool", v.sort, context);
	return v.value;
};

/**
 * Extract the closure parts from a `func` value, or throw {@link SortError}.
 *
 * @param v - The value to unwrap.
 * @param context - Optional description for the error message.
 * @returns The compiled body and captured closure.
 * @throws {SortError} If `v` is not `func`-sorted.
 */
export const asFunc = (
	v: Value,
	context?: string,
): {
	readonly body: import("./ast.js").CompiledExpr;
	readonly closure: readonly Value[];
} => {
	if (v.sort !== "func") throw new SortError("func", v.sort, context);
	return { body: v.body, closure: v.closure };
};

/**
 * Extract the record dictionary from a `record` value, or throw {@link SortError}.
 *
 * @param v - The value to unwrap.
 * @param context - Optional description for the error message.
 * @returns The wrapped record dictionary.
 * @throws {SortError} If `v` is not `record`-sorted.
 */
export const asRecord = (v: Value, context?: string): Readonly<Record<string, Value>> => {
	if (v.sort !== "record") throw new SortError("record", v.sort, context);
	return v.value;
};

//#endregion

//#region Display

/**
 * Render a value as a human-readable string.
 *
 * @param v - The value to display.
 * @returns A display string (e.g. `"∅"` for the empty set, `"<function>"` for closures).
 */
export const showValue = (v: Value): string => {
	switch (v.sort) {
		case "num":
			return Object.is(v.value, -0) ? "-0" : String(v.value);
		case "bool":
			return String(v.value);
		case "set":
			return v.value.size === 0 ? "∅" : `{${[...v.value].join(", ")}}`;
		case "func":
			return "<function>";
		case "record": {
			const entries = Object.entries(v.value).map(([k, val]) => `${k}: ${showValue(val)}`);
			return `{${entries.join(", ")}}`;
		}
		default:
			return assertNever(v);
	}
};

//#endregion

//#region Utilities

/**
 * Structural equality for finite number sets.
 *
 * @param a - First set.
 * @param b - Second set.
 * @returns `true` when both sets contain exactly the same elements.
 */
export const setEq = (a: ReadonlySet<number>, b: ReadonlySet<number>): boolean => {
	if (a.size !== b.size) return false;
	for (const x of a) {
		if (!b.has(x)) return false;
	}
	return true;
};

//#endregion
