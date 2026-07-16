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
 * @fileoverview Type-class dispatch tables for the math expression engine.
 *
 * Each table maps a 32-bit bitmask key encoding the operator ID and operand sort IDs
 * to an implementation function. This provides O(1) fast-path dispatch.
 *
 * String keys are parsed and encoded to bitmasks at registration/lookup time,
 * preserving compatibility with the string-based registration API.
 *
 * @module @resq-systems/math/instance
 */

import type { BinaryOp, LogicOp, RelOp, UnaryOp } from "./ast.js";
import { DomainError, MathError } from "./error.js";
import type { Sort, Value } from "./value.js";
import { asBool, asNum, asSet, bool, mkSet, num, setEq } from "./value.js";

// ────────────────────────── Sort and Operator ID Maps ──────────────────────────

const sortIds: Readonly<Record<Sort, number>> = Object.assign(Object.create(null), {
	num: 1,
	set: 2,
	bool: 3,
	func: 4,
	record: 5,
});

const unaryIds: Readonly<Record<UnaryOp, number>> = Object.assign(Object.create(null), {
	neg: 1,
	sqrt: 2,
	abs: 3,
	floor: 4,
	ceil: 5,
	not: 6,
	card: 7,
	factorial: 8,
});

const binaryIds: Readonly<Record<BinaryOp, number>> = Object.assign(Object.create(null), {
	"+": 1,
	"-": 2,
	"×": 3,
	"÷": 4,
	mod: 5,
	pow: 6,
	"∪": 7,
	"∩": 8,
	"∖": 9,
	"△": 10,
});

const relIds: Readonly<Record<RelOp, number>> = Object.assign(Object.create(null), {
	"=": 1,
	"≠": 2,
	"<": 3,
	">": 4,
	"≤": 5,
	"≥": 6,
	"∈": 7,
	"∉": 8,
	"⊂": 9,
	"⊆": 10,
});

const logicIds: Readonly<Record<LogicOp, number>> = Object.assign(Object.create(null), {
	"∧": 1,
	"∨": 2,
	"⊻": 3,
	"⇒": 4,
	"⇔": 5,
});

const isSort = (s: string | undefined): s is Sort => s !== undefined && s in sortIds;
const isUnaryOp = (s: string | undefined): s is UnaryOp => s !== undefined && s in unaryIds;
const isBinaryOp = (s: string | undefined): s is BinaryOp => s !== undefined && s in binaryIds;
const isRelOp = (s: string | undefined): s is RelOp => s !== undefined && s in relIds;
const isLogicOp = (s: string | undefined): s is LogicOp => s !== undefined && s in logicIds;

// ────────────────────────── Bitmask Encoding ──────────────────────────

/** Encode unary operator and argument sort into a single integer key. */
export const encodeUnary = (op: UnaryOp, sort: Sort): number => {
	const opId = unaryIds[op];
	const sortId = sortIds[sort];
	if (!opId || !sortId) return 0;
	return (opId << 8) | sortId;
};

/** Encode binary operator and left/right sorts into a single integer key. */
export const encodeBinary = (op: BinaryOp, sortL: Sort, sortR: Sort): number => {
	const opId = binaryIds[op];
	const lId = sortIds[sortL];
	const rId = sortIds[sortR];
	if (!opId || !lId || !rId) return 0;
	return (opId << 16) | (lId << 8) | rId;
};

/** Encode relational operator and left/right sorts into a single integer key. */
export const encodeRel = (op: RelOp, sortL: Sort, sortR: Sort): number => {
	const opId = relIds[op];
	const lId = sortIds[sortL];
	const rId = sortIds[sortR];
	if (!opId || !lId || !rId) return 0;
	return (opId << 16) | (lId << 8) | rId;
};

/** Encode logical operator and left/right sorts into a single integer key. */
export const encodeLogic = (op: LogicOp, sortL: Sort, sortR: Sort): number => {
	const opId = logicIds[op];
	const lId = sortIds[sortL];
	const rId = sortIds[sortR];
	if (!opId || !lId || !rId) return 0;
	return (opId << 16) | (lId << 8) | rId;
};

// ────────────────────────── Instance types ──────────────────────────

type UnaryImpl = (a: Value) => Value;
type BinaryImpl = (a: Value, b: Value) => Value;
type RelImpl = (a: Value, b: Value) => boolean;
type LogicImpl = (a: Value, b: Value) => boolean;

// ────────────────────────── Factorial helper ──────────────────────────

const factorialOf = (n: number): number => {
	if (n < 0) throw new DomainError("factorial", "argument must be non-negative");
	if (!Number.isInteger(n)) throw new DomainError("factorial", "argument must be an integer");
	if (n > 170) throw new DomainError("factorial", "argument too large (>170 overflows)");
	let result = 1;
	for (let i = 2; i <= n; i++) result *= i;
	return result;
};

// ────────────────────────── Tables ──────────────────────────

const unaryTable = new Map<number, UnaryImpl>([
	[encodeUnary("neg", "num"), (a) => num(-asNum(a))],
	[
		encodeUnary("sqrt", "num"),
		(a) => {
			const n = asNum(a);
			if (n < 0) throw new DomainError("sqrt", "argument must be non-negative");
			return num(Math.sqrt(n));
		},
	],
	[encodeUnary("abs", "num"), (a) => num(Math.abs(asNum(a)))],
	[encodeUnary("floor", "num"), (a) => num(Math.floor(asNum(a)))],
	[encodeUnary("ceil", "num"), (a) => num(Math.ceil(asNum(a)))],
	[encodeUnary("factorial", "num"), (a) => num(factorialOf(asNum(a)))],
	[encodeUnary("not", "bool"), (a) => bool(!asBool(a))],
	[encodeUnary("card", "set"), (a) => num(asSet(a).size)],
]);

const binaryTable = new Map<number, BinaryImpl>([
	// Arithmetic
	[encodeBinary("+", "num", "num"), (a, b) => num(asNum(a) + asNum(b))],
	[encodeBinary("-", "num", "num"), (a, b) => num(asNum(a) - asNum(b))],
	[encodeBinary("×", "num", "num"), (a, b) => num(asNum(a) * asNum(b))],
	[
		encodeBinary("÷", "num", "num"),
		(a, b) => {
			const d = asNum(b);
			if (d === 0) throw new DomainError("÷", "division by zero");
			return num(asNum(a) / d);
		},
	],
	[
		encodeBinary("mod", "num", "num"),
		(a, b) => {
			const d = asNum(b);
			if (d === 0) throw new DomainError("mod", "division by zero");
			return num(asNum(a) % d);
		},
	],
	[encodeBinary("pow", "num", "num"), (a, b) => num(asNum(a) ** asNum(b))],

	// Set operations
	[
		encodeBinary("∪", "set", "set"),
		(a, b) => {
			const sa = asSet(a);
			const sb = asSet(b);
			const res = new Set<number>(sa);
			for (const x of sb) res.add(x);
			return mkSet(res);
		},
	],
	[
		encodeBinary("∩", "set", "set"),
		(a, b) => {
			const sa = asSet(a);
			const sb = asSet(b);
			const res = new Set<number>();
			for (const x of sa) {
				if (sb.has(x)) res.add(x);
			}
			return mkSet(res);
		},
	],
	[
		encodeBinary("∖", "set", "set"),
		(a, b) => {
			const sa = asSet(a);
			const sb = asSet(b);
			const res = new Set<number>();
			for (const x of sa) {
				if (!sb.has(x)) res.add(x);
			}
			return mkSet(res);
		},
	],
	[
		encodeBinary("△", "set", "set"),
		(a, b) => {
			const sa = asSet(a);
			const sb = asSet(b);
			const result = new Set<number>();
			for (const x of sa) if (!sb.has(x)) result.add(x);
			for (const x of sb) if (!sa.has(x)) result.add(x);
			return mkSet(result);
		},
	],

	// + overloaded on sets (disjoint union)
	[
		encodeBinary("+", "set", "set"),
		(a, b) => {
			const sa = asSet(a);
			const sb = asSet(b);
			const res = new Set<number>(sa);
			for (const x of sb) res.add(x);
			return mkSet(res);
		},
	],
]);

const relTable = new Map<number, RelImpl>([
	// Numeric
	[encodeRel("=", "num", "num"), (a, b) => asNum(a) === asNum(b)],
	[encodeRel("≠", "num", "num"), (a, b) => asNum(a) !== asNum(b)],
	[encodeRel("<", "num", "num"), (a, b) => asNum(a) < asNum(b)],
	[encodeRel(">", "num", "num"), (a, b) => asNum(a) > asNum(b)],
	[encodeRel("≤", "num", "num"), (a, b) => asNum(a) <= asNum(b)],
	[encodeRel("≥", "num", "num"), (a, b) => asNum(a) >= asNum(b)],

	// Set equality
	[encodeRel("=", "set", "set"), (a, b) => setEq(asSet(a), asSet(b))],
	[encodeRel("≠", "set", "set"), (a, b) => !setEq(asSet(a), asSet(b))],

	// Bool equality
	[encodeRel("=", "bool", "bool"), (a, b) => asBool(a) === asBool(b)],
	[encodeRel("≠", "bool", "bool"), (a, b) => asBool(a) !== asBool(b)],

	// Membership
	[encodeRel("∈", "num", "set"), (a, b) => asSet(b).has(asNum(a))],
	[encodeRel("∉", "num", "set"), (a, b) => !asSet(b).has(asNum(a))],

	// Subset
	[
		encodeRel("⊂", "set", "set"),
		(a, b) => {
			const sa = asSet(a);
			const sb = asSet(b);
			if (sa.size >= sb.size) return false;
			for (const x of sa) {
				if (!sb.has(x)) return false;
			}
			return true;
		},
	],
	[
		encodeRel("⊆", "set", "set"),
		(a, b) => {
			const sa = asSet(a);
			const sb = asSet(b);
			for (const x of sa) {
				if (!sb.has(x)) return false;
			}
			return true;
		},
	],
]);

const logicTable = new Map<number, LogicImpl>([
	[encodeLogic("∧", "bool", "bool"), (a, b) => asBool(a) && asBool(b)],
	[encodeLogic("∨", "bool", "bool"), (a, b) => asBool(a) || asBool(b)],
	[encodeLogic("⊻", "bool", "bool"), (a, b) => asBool(a) !== asBool(b)],
	[encodeLogic("⇒", "bool", "bool"), (a, b) => !asBool(a) || asBool(b)],
	[encodeLogic("⇔", "bool", "bool"), (a, b) => asBool(a) === asBool(b)],
]);

// ────────────────────────── Lookup API ──────────────────────────

/** Look up a unary operator implementation. */
export const lookupUnary = (key: number): UnaryImpl | undefined => unaryTable.get(key);

/** Look up a binary operator implementation. */
export const lookupBinary = (key: number): BinaryImpl | undefined => binaryTable.get(key);

/** Look up a relational operator implementation. */
export const lookupRel = (key: number): RelImpl | undefined => relTable.get(key);

/** Look up a logic operator implementation. */
export const lookupLogic = (key: number): LogicImpl | undefined => logicTable.get(key);

// ────────────────────────── Extensibility API ──────────────────────────

/** Register a custom unary operator instance. */
export const registerUnary = (key: string, impl: UnaryImpl): void => {
	const parts = key.split(":");
	if (parts.length !== 2) throw new MathError("INVALID_KEY", `Invalid unary key: ${key}`);
	const [op, sort] = parts;
	if (!isUnaryOp(op)) throw new MathError("INVALID_OP", `Unknown unary operator: ${op}`);
	if (!isSort(sort)) throw new MathError("INVALID_SORT", `Unknown sort: ${sort}`);
	unaryTable.set(encodeUnary(op, sort), impl);
};

/** Register a custom binary operator instance. */
export const registerBinary = (key: string, impl: BinaryImpl): void => {
	const parts = key.split(":");
	if (parts.length !== 3) throw new MathError("INVALID_KEY", `Invalid binary key: ${key}`);
	const [op, sortL, sortR] = parts;
	if (!isBinaryOp(op)) throw new MathError("INVALID_OP", `Unknown binary operator: ${op}`);
	if (!isSort(sortL) || !isSort(sortR)) {
		throw new MathError("INVALID_SORT", `Unknown sort in: ${key}`);
	}
	binaryTable.set(encodeBinary(op, sortL, sortR), impl);
};

/** Register a custom relational operator instance. */
export const registerRelation = (key: string, impl: RelImpl): void => {
	const parts = key.split(":");
	if (parts.length !== 3) throw new MathError("INVALID_KEY", `Invalid relation key: ${key}`);
	const [op, sortL, sortR] = parts;
	if (!isRelOp(op)) throw new MathError("INVALID_OP", `Unknown relational operator: ${op}`);
	if (!isSort(sortL) || !isSort(sortR)) {
		throw new MathError("INVALID_SORT", `Unknown sort in: ${key}`);
	}
	relTable.set(encodeRel(op, sortL, sortR), impl);
};

/** Register a custom logic operator instance. */
export const registerLogic = (key: string, impl: LogicImpl): void => {
	const parts = key.split(":");
	if (parts.length !== 3) throw new MathError("INVALID_KEY", `Invalid logic key: ${key}`);
	const [op, sortL, sortR] = parts;
	if (!isLogicOp(op)) throw new MathError("INVALID_OP", `Unknown logical operator: ${op}`);
	if (!isSort(sortL) || !isSort(sortR)) {
		throw new MathError("INVALID_SORT", `Unknown sort in: ${key}`);
	}
	logicTable.set(encodeLogic(op, sortL, sortR), impl);
};
