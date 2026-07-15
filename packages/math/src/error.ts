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
 * @fileoverview Typed error hierarchy for the math expression engine.
 *
 * Every error thrown by the engine is an instance of {@link MathError}, so
 * consumers can catch broadly (`MathError`) or narrowly (`DomainError`).
 * Each subclass carries structured context beyond the message string.
 *
 * @module @resq-systems/math/error
 */

/** Base class for all math engine errors. */
export class MathError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "MathError";
		this.code = code;
	}
}

/**
 * Thrown when a value's sort does not match what an operator expects.
 *
 * @example
 * ```ts
 * asNum(bool(true)); // throws SortError("num", "bool")
 * ```
 */
export class SortError extends MathError {
	readonly expectedSort: string;
	readonly actualSort: string;

	constructor(expected: string, actual: string, context?: string) {
		const msg = context
			? `Expected ${expected}, got ${actual} in ${context}`
			: `Expected ${expected}, got ${actual}`;
		super("SORT_ERROR", msg);
		this.name = "SortError";
		this.expectedSort = expected;
		this.actualSort = actual;
	}
}

/** Thrown when a variable is referenced but not present in the environment. */
export class UnboundVariableError extends MathError {
	readonly variableName: string;

	constructor(name: string) {
		super("UNBOUND_VARIABLE", `Unbound variable: ${name}`);
		this.name = "UnboundVariableError";
		this.variableName = name;
	}
}

/**
 * Thrown when no type-class instance exists for an operator+sort combination.
 *
 * @example
 * ```ts
 * // There is no instance for "+:bool:bool", so:
 * evaluate(add(B(true), B(false))); // throws UndefinedOpError("+", ["bool", "bool"])
 * ```
 */
export class UndefinedOpError extends MathError {
	readonly operator: string;
	readonly sorts: readonly string[];

	constructor(operator: string, sorts: readonly string[]) {
		const sortStr = sorts.length === 1 ? sorts[0] : sorts.join(" × ");
		super("UNDEFINED_OP", `${operator} is not defined on ${sortStr}`);
		this.name = "UndefinedOpError";
		this.operator = operator;
		this.sorts = sorts;
	}
}

/**
 * Thrown when an operation is sort-compatible but mathematically invalid.
 *
 * Division by zero, square root of a negative, factorial of a non-integer, etc.
 */
export class DomainError extends MathError {
	readonly operator: string;
	readonly reason: string;

	constructor(operator: string, reason: string) {
		super("DOMAIN_ERROR", `${operator}: ${reason}`);
		this.name = "DomainError";
		this.operator = operator;
		this.reason = reason;
	}
}

/** Thrown by the Pratt parser for invalid or unexpected input. */
export class ParseError extends MathError {
	readonly position: number;
	readonly found: string;

	constructor(message: string, position: number, found?: string) {
		super("PARSE_ERROR", message);
		this.name = "ParseError";
		this.position = position;
		this.found = found ?? "";
	}
}
