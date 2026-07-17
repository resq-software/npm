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

/**
 * Base class for all math engine errors.
 *
 * Every error the engine throws is an instance of this class, so `catch (e) { if
 * (e instanceof MathError) … }` reliably distinguishes engine failures from
 * unrelated exceptions. Each subclass overrides `name` to its own class name and
 * fixes a distinct {@link code}; the pair `(name, code)` is stable across
 * releases and safe to switch on, whereas `message` is human-facing and may change.
 */
export class MathError extends Error {
	/** Stable machine-readable error code (e.g. `"SORT_ERROR"`); constant per subclass. */
	readonly code: string;

	/**
	 * @param code - Stable machine-readable error code.
	 * @param message - Human-readable description.
	 */
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
	/** The sort the operator required. */
	readonly expectedSort: string;
	/** The sort actually supplied. */
	readonly actualSort: string;

	/**
	 * @param expected - The sort the operator required.
	 * @param actual - The sort actually supplied.
	 * @param context - Optional location hint (e.g. operator name) for the message.
	 */
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
	/** Name of the variable that was not found in the environment. */
	readonly variableName: string;

	/**
	 * @param name - Name of the unbound variable.
	 */
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
 * // There is no instance for "+:bool:bool", so evaluating a bool addition:
 * evaluate(compile(add(B(true), B(false)))); // throws UndefinedOpError("+", ["bool", "bool"])
 * ```
 */
export class UndefinedOpError extends MathError {
	/** The operator symbol with no matching instance. */
	readonly operator: string;
	/** The operand sorts that had no registered instance. */
	readonly sorts: readonly string[];

	/**
	 * @param operator - The operator symbol with no matching instance.
	 * @param sorts - The operand sorts that had no registered instance.
	 */
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
	/** The operator whose domain constraint was violated. */
	readonly operator: string;
	/** Why the operation is mathematically invalid. */
	readonly reason: string;

	/**
	 * @param operator - The operator whose domain constraint was violated.
	 * @param reason - Why the operation is mathematically invalid.
	 */
	constructor(operator: string, reason: string) {
		super("DOMAIN_ERROR", `${operator}: ${reason}`);
		this.name = "DomainError";
		this.operator = operator;
		this.reason = reason;
	}
}

/** Thrown by the Pratt parser for invalid or unexpected input. */
export class ParseError extends MathError {
	/** Zero-based character offset in the source where parsing failed. */
	readonly position: number;
	/** The token or character actually encountered. */
	readonly found: string;

	/**
	 * @param message - Human-readable description of the parse failure.
	 * @param position - Zero-based character offset where parsing failed.
	 * @param found - The token or character actually encountered.
	 */
	constructor(message: string, position: number, found?: string) {
		super("PARSE_ERROR", message);
		this.name = "ParseError";
		this.position = position;
		this.found = found ?? "";
	}
}

/** Thrown when a lexical stack lookup is out of bounds. */
export class StackError extends MathError {
	/** The De Bruijn index that was requested. */
	readonly index: number;
	/** The stack depth available at the time of access. */
	readonly depth: number;

	/**
	 * @param index - The De Bruijn index that was requested.
	 * @param depth - The stack depth available at the time of access.
	 */
	constructor(index: number, depth: number) {
		super("STACK_ERROR", `Stack access out of bounds: index ${index} at depth ${depth}`);
		this.name = "StackError";
		this.index = index;
		this.depth = depth;
	}
}

/** Thrown when evaluator execution steps exceed the configured limit. */
export class ExecutionLimitError extends MathError {
	/** The configured maximum number of execution steps. */
	readonly limit: number;

	/**
	 * @param limit - The configured maximum number of execution steps.
	 */
	constructor(limit: number) {
		super("EXECUTION_LIMIT", `Execution step limit exceeded: ${limit}`);
		this.name = "ExecutionLimitError";
		this.limit = limit;
	}
}

/** Thrown when recursion depth exceeds the configured limit during parsing or evaluation. */
export class RecursionLimitError extends MathError {
	/** The configured maximum recursion depth. */
	readonly limit: number;

	/**
	 * @param limit - The configured maximum recursion depth.
	 */
	constructor(limit: number) {
		super("RECURSION_LIMIT", `Maximum recursion depth exceeded: ${limit}`);
		this.name = "RecursionLimitError";
		this.limit = limit;
	}
}
