/**
 * Copyright 2026 ResQ
 * SPDX-License-Identifier: Apache-2.0
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
 * A tiny two-sort expression engine: numbers + finite sets, with relations.
 *
 * Shows the architecture that DOES scale (unlike Record<Operator, fn>):
 *   1. AST         — a discriminated union of node kinds, not a flat op->fn map.
 *   2. Sorts       — values are tagged with their domain (num | set | bool).
 *   3. Dispatch by TYPE, not by symbol — the "type-class" idea: the same symbol
 *      (+, ×) resolves to a different implementation per operand sort. That is
 *      the principled version of your Record instinct.
 *   4. Relations return `bool`, so they live in a separate table (different
 *      return type — the thing a single `Operation` signature can't express).
 *   5. A binder (∑) is its own node: it holds an UNEVALUATED body and evaluates
 *      it once per element in an extended environment. Binders are not functions
 *      of already-evaluated operands — this is why ∑/∫/∀ can't be table entries.
 *
 * The second half of the file runs the same demos through @resq-systems/math,
 * which is this design shipped: same sorts, same sort-keyed dispatch, same
 * binders, plus a parser, a static sort pass and a compile step.
 *
 * Run:  bun run examples/math-sketch/math-sketch.ts
 */

import * as math from "@resq-systems/math";
import { matchTag } from "@resq-systems/types/union";

// ---------- Values: the two domains ("sorts") + booleans for relations ----------
type Value =
	| { readonly sort: "num"; readonly value: number }
	| { readonly sort: "set"; readonly value: ReadonlySet<number> }
	| { readonly sort: "bool"; readonly value: boolean };

type Sort = Value["sort"];

const num = (n: number): Value => ({ sort: "num", value: n });
const set = (xs: Iterable<number>): Value => ({
	sort: "set",
	value: new Set(xs),
});
const bool = (b: boolean): Value => ({ sort: "bool", value: b });

const asNum = (v: Value): number => {
	if (v.sort !== "num") throw new TypeError(`expected num, got ${v.sort}`);
	return v.value;
};
const asSet = (v: Value): ReadonlySet<number> => {
	if (v.sort !== "set") throw new TypeError(`expected set, got ${v.sort}`);
	return v.value;
};
const asBool = (v: Value): boolean => {
	if (v.sort !== "bool") throw new TypeError(`expected bool, got ${v.sort}`);
	return v.value;
};

// ---------- AST: nodes, not a flat op->fn map ----------
type UnOp = "neg" | "card" | "not"; //  −x   #S   ¬p
type BinOp = "+" | "×" | "∪" | "∩"; //  overloaded across sorts
type RelOp = "=" | "<" | "∈" | "⊆"; //  return bool

type Expr =
	| { kind: "lit"; value: Value }
	| { kind: "var"; name: string }
	| { kind: "unary"; op: UnOp; arg: Expr }
	| { kind: "binary"; op: BinOp; left: Expr; right: Expr }
	| { kind: "relation"; op: RelOp; left: Expr; right: Expr }
	| { kind: "bigSum"; bound: string; over: Expr; body: Expr }; // ∑_{bound ∈ over} body

// ---------- "Type-class" instances: dispatch keyed on (op, operand sorts) ----------
// Same symbol, different implementation per sort. Missing key = "operator not
// defined on those domains" — the honest analogue of a typeclass with no instance.
type BinKey = `${BinOp}:${Sort}:${Sort}`;
const binInstances: Partial<Record<BinKey, (a: Value, b: Value) => Value>> = {
	"+:num:num": (a, b) => num(asNum(a) + asNum(b)),
	"×:num:num": (a, b) => num(asNum(a) * asNum(b)),
	"∪:set:set": (a, b) => set([...asSet(a), ...asSet(b)]),
	"∩:set:set": (a, b) => set([...asSet(a)].filter((x) => asSet(b).has(x))),
	// '+' overloaded onto sets (the article notes + is sometimes a disjoint union):
	"+:set:set": (a, b) => set([...asSet(a), ...asSet(b)]),
};

type UnKey = `${UnOp}:${Sort}`;
const unInstances: Partial<Record<UnKey, (a: Value) => Value>> = {
	"neg:num": (a) => num(-asNum(a)),
	"card:set": (a) => num(asSet(a).size), // #S : the cardinality operator returns a num
	"not:bool": (a) => bool(!asBool(a)),
};

type RelKey = `${RelOp}:${Sort}:${Sort}`;
const setEq = (a: ReadonlySet<number>, b: ReadonlySet<number>): boolean =>
	a.size === b.size && [...a].every((x) => b.has(x));
const relInstances: Partial<Record<RelKey, (a: Value, b: Value) => boolean>> = {
	"=:num:num": (a, b) => asNum(a) === asNum(b),
	"<:num:num": (a, b) => asNum(a) < asNum(b),
	"=:set:set": (a, b) => setEq(asSet(a), asSet(b)),
	"∈:num:set": (a, b) => asSet(b).has(asNum(a)),
	"⊆:set:set": (a, b) => [...asSet(a)].every((x) => asSet(b).has(x)),
};

// ---------- Evaluator: walks the AST, resolves overloads by sort ----------
type Env = ReadonlyMap<string, Value>;

// @resq-systems/types — `matchTag` is the `switch (e.kind)` this used to be, with the
// exhaustiveness the switch never had. There was no `default` and no `assertNever`, so
// adding a seventh node kind to `Expr` would have compiled cleanly and returned
// `undefined` at runtime for that kind, while the signature kept promising `Value`.
// A missing arm here is a compile error naming the arm.
//
// Each arm receives the member already narrowed, so `n.value`, `n.arg` and `n.bound`
// are reachable without a cast — what `case "lit":` bought, as a value rather than syntax.
const evaluate = (e: Expr, env: Env = new Map()): Value =>
	matchTag(e, "kind", {
		lit: (n) => n.value,

		var: (n) => {
			const bound = env.get(n.name);
			if (bound === undefined) throw new Error(`unbound variable: ${n.name}`);
			return bound;
		},

		unary: (n) => {
			const a = evaluate(n.arg, env);
			const impl = unInstances[`${n.op}:${a.sort}`];
			if (!impl) throw new Error(`${n.op} is undefined on ${a.sort}`);
			return impl(a);
		},

		binary: (n) => {
			const a = evaluate(n.left, env);
			const b = evaluate(n.right, env);
			const impl = binInstances[`${n.op}:${a.sort}:${b.sort}`];
			if (!impl) throw new Error(`${n.op} is undefined on ${a.sort}×${b.sort}`);
			return impl(a, b);
		},

		relation: (n) => {
			const a = evaluate(n.left, env);
			const b = evaluate(n.right, env);
			const impl = relInstances[`${n.op}:${a.sort}:${b.sort}`];
			if (!impl) throw new Error(`${n.op} is undefined on ${a.sort}×${b.sort}`);
			return bool(impl(a, b));
		},

		bigSum: (n) => {
			// Binder: the body is NOT pre-evaluated; it runs once per element with the
			// bound variable added to the environment. This is why ∑/∫/∀ can't be
			// table entries keyed on evaluated operands.
			const domain = evaluate(n.over, env);
			if (domain.sort !== "set") throw new Error("∑ requires a set domain");
			let acc = 0;
			for (const x of domain.value) {
				const r = evaluate(n.body, new Map(env).set(n.bound, num(x)));
				acc += asNum(r);
			}
			return num(acc);
		},
	});

// ---------- Tiny constructors so the demos read like math ----------
const lit = (value: Value): Expr => ({ kind: "lit", value });
const v = (name: string): Expr => ({ kind: "var", name });
const bin = (op: BinOp, left: Expr, right: Expr): Expr => ({
	kind: "binary",
	op,
	left,
	right,
});
const rel = (op: RelOp, left: Expr, right: Expr): Expr => ({
	kind: "relation",
	op,
	left,
	right,
});
const card = (arg: Expr): Expr => ({ kind: "unary", op: "card", arg });
const sum = (bound: string, over: Expr, body: Expr): Expr => ({
	kind: "bigSum",
	bound,
	over,
	body,
});

const show = (val: Value): string =>
	val.sort === "set" ? `{${[...val.value].join(", ")}}` : String(val.value);

// ---------- Demos ----------
const N = (n: number): Expr => lit(num(n));
const S = (...xs: number[]): Expr => lit(set(xs));

const demos: ReadonlyArray<readonly [string, Expr]> = [
	["(2 + 3) × 4", bin("×", bin("+", N(2), N(3)), N(4))], //           num arithmetic
	["{1,2,3} ∪ {3,4}", bin("∪", S(1, 2, 3), S(3, 4))], //             same engine, set domain
	["{1,2} + {2,3}   (+ overloaded on sets)", bin("+", S(1, 2), S(2, 3))],
	["#({1,2,3} ∩ {2,3,4})", card(bin("∩", S(1, 2, 3), S(2, 3, 4)))], // set -> num via #
	["2 ∈ {1,2,3}", rel("∈", N(2), S(1, 2, 3))], //                    relation -> bool
	["{1} ⊆ {1,2}", rel("⊆", S(1), S(1, 2))],
	["∑_{i ∈ {1,2,3}} i × i", sum("i", S(1, 2, 3), bin("×", v("i"), v("i")))], // binder
];

for (const [label, expr] of demos) {
	console.log(`${label.padEnd(38)} = ${show(evaluate(expr))}`);
}

// ---------- The same architecture, shipped: @resq-systems/math ----------
// Everything above is a sketch of a design. @resq-systems/math is that design
// hardened — it is sorted values, dispatch keyed on (symbol, operand sorts),
// relations in their own table, and binders as a node kind holding an
// unevaluated body. The five claims in the header comment are its structure.
//
// What a sketch skips and the package does not:
//
//   parse      a Pratt parser, so an expression can arrive as text
//   checkExpr  a STATIC sort pass that RETURNS its errors rather than throwing,
//              so you can learn the result sort without having run anything
//   compile    bound variables resolved to De Bruijn indices, so `evaluate`
//              indexes a stack instead of allocating the `new Map(env).set(…)`
//              that `bigSum` above pays once per element of the domain
//
// The order is load-bearing: `evaluate` takes a CompiledExpr, so the call is
// always `evaluate(compile(expr))` — `evaluate(expr)` does not typecheck.
//
// Imported as a namespace on purpose. The package exports `num`, `bool`, `lit`,
// `v`, `card`, `sum`, `setEq`, `evaluate`, `N`, `S` and the types `Value`,
// `Sort`, `Expr`, `Env` — every one of which this file has already bound above.
// `math.` keeps the sketch and the shipped engine visible side by side instead
// of making either one shadow the other.

// A CheckResult is a discriminated union, not a thrown error: `ok` carries the
// inferred sort, and the failure case carries ALL the sort errors, not just the
// first one the walker tripped over.
const describe = (result: math.CheckResult): string =>
	result.ok ? result.sort : result.errors.map((e) => e.message).join("; ");

// Only MathError is ours. Anything else is a bug in this file and must keep
// propagating — a catch-all here would hide it.
const caught = (thunk: () => string): string => {
	try {
		return thunk();
	} catch (error) {
		if (error instanceof math.MathError) return `${error.code} — ${error.message}`;
		throw error;
	}
};

// ---------- The demos above, as source text, through the real pipeline ----------
// Note what `print` does on the way back out: ASCII `*` renders as `×`, and the
// parser's `sum(i in …, …)` renders as `∑(i ∈ …) …` — the notation the sketch
// could only put in a hand-written label. Unicode operators parse on input too,
// so `∪`, `∩`, `∈` and `⊆` below are read, not just written.
const sources: readonly string[] = [
	"(2 + 3) * 4", //                     ASCII in, mathematical notation out
	"{1,2,3} ∪ {3,4}", //                 same engine, set domain
	"{1,2} + {2,3}", //                   `+` really is overloaded onto sets here
	"#({1,2,3} ∩ {2,3,4})", //            set -> num via #
	"2 ∈ {1,2,3}", //                     relation -> bool
	"{1} ⊆ {1,2}",
	"sum(i in {1,2,3}, i * i)", //        binder
];

console.log("\n@resq-systems/math — parse → check → compile → evaluate\n");

for (const source of sources) {
	const expr = math.parse(source);
	const checked = math.checkExpr(expr);
	// The check GATES the run. Nothing is evaluated for an expression whose sorts
	// did not line up, which is the entire reason the stage exists.
	const value = checked.ok ? math.showValue(math.evaluate(math.compile(expr))) : "(not evaluated)";
	console.log(`${math.print(expr).padEnd(26)} = ${value.padEnd(14)} : ${describe(checked)}`);
}

// ---------- Free variables: two maps, at two different stages ----------
// The sketch has one environment. The package has two, because the static pass
// and the evaluator want different things about the same free variable:
//
//   SortContext  ReadonlyMap<string, Sort>   checkExpr needs its DOMAIN, to infer
//                                            a result sort without running it
//   Env          ReadonlyMap<string, Value>  evaluate needs its VALUE
//
// Omitting the SortContext is not "no opinion about x" — the check reports it as
// unbound, because an expression with an unknown free variable has no inferable
// sort to report. Omitting the Env is the matching failure one stage later.
const open = math.parse("x * 2");
const context: math.SortContext = new Map([["x", "num"]]);
const env: math.Env = new Map([["x", math.num(21)]]);

console.log(`\n${math.print(open)}`);
console.log(`  checked, no context  : ${describe(math.checkExpr(open))}`);
console.log(`  checked, x : num     : ${describe(math.checkExpr(open, context))}`);
console.log(
	`  evaluated, no env    : ${caught(() => math.showValue(math.evaluate(math.compile(open))))}`,
);
console.log(`  evaluated, x = 21    : ${math.showValue(math.evaluate(math.compile(open), env))}`);

// ---------- Three ways this engine says no ----------
// Which channel a failure arrives on is a decision, not an accident:
//
//   parse      THROWS ParseError. The text is not an expression, so there is no
//              Expr to hand back and nothing downstream to attempt.
//   checkExpr  RETURNS { ok: false, errors }. A sort mismatch is a RESULT about a
//              well-formed expression, and a caller usually wants every one of them.
//   evaluate   THROWS a MathError subclass. The expression was well sorted, so the
//              failure is about the actual values and belongs at the point that
//              produced it.
//
// All of them carry a stable `.code`, so `instanceof MathError` plus a switch on
// `.code` is the handler — never a match on message text.
console.log("\nHow failure surfaces\n");

console.log(`parse("2 +")             : ${caught(() => math.print(math.parse("2 +")))}`);

// `.code` is what you branch on, but the subclass behind it carries structured
// fields — ParseError knows where it stopped, DomainError knows which operator
// refused, ExecutionLimitError knows the budget it hit. None of that has to be
// recovered by scraping the message.
try {
	math.parse("2 +");
} catch (error) {
	if (!(error instanceof math.ParseError)) throw error;
	console.log(
		`  …and where it stopped  : position ${error.position}, found ${JSON.stringify(error.found)}`,
	);
}

console.log(
	`check 1 + true           : ${describe(math.checkExpr(math.add(math.N(1), math.B(true))))}`,
);
console.log(`check #3                 : ${describe(math.checkExpr(math.card(math.N(3))))}`);
console.log(
	`evaluate 1 / 0           : ${caught(() => math.showValue(math.evaluate(math.compile(math.parse("1 / 0")))))}`,
);

// A step budget, for evaluating an expression you did not write yourself. The
// engine stops at the limit rather than running as long as the input asks it to.
console.log(
	`evaluate under 3 steps   : ${caught(() =>
		math.showValue(
			math.evaluate(math.compile(math.parse("sum(i in {1,2,3}, i * i)")), undefined, undefined, {
				maxSteps: 3,
			}),
		),
	)}`,
);
