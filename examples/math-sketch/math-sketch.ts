/**
 * Copyright 2026 ResQ
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
 * Run:  bun run examples/math-sketch/math-sketch.ts
 */

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

const evaluate = (e: Expr, env: Env = new Map()): Value => {
	switch (e.kind) {
		case "lit":
			return e.value;
		case "var": {
			const bound = env.get(e.name);
			if (bound === undefined) throw new Error(`unbound variable: ${e.name}`);
			return bound;
		}
		case "unary": {
			const a = evaluate(e.arg, env);
			const impl = unInstances[`${e.op}:${a.sort}`];
			if (!impl) throw new Error(`${e.op} is undefined on ${a.sort}`);
			return impl(a);
		}
		case "binary": {
			const a = evaluate(e.left, env);
			const b = evaluate(e.right, env);
			const impl = binInstances[`${e.op}:${a.sort}:${b.sort}`];
			if (!impl) throw new Error(`${e.op} is undefined on ${a.sort}×${b.sort}`);
			return impl(a, b);
		}
		case "relation": {
			const a = evaluate(e.left, env);
			const b = evaluate(e.right, env);
			const impl = relInstances[`${e.op}:${a.sort}:${b.sort}`];
			if (!impl) throw new Error(`${e.op} is undefined on ${a.sort}×${b.sort}`);
			return bool(impl(a, b));
		}
		case "bigSum": {
			// Binder: the body is NOT pre-evaluated; it runs once per element with the
			// bound variable added to the environment. This is why ∑/∫/∀ can't be
			// table entries keyed on evaluated operands.
			const domain = evaluate(e.over, env);
			if (domain.sort !== "set") throw new Error("∑ requires a set domain");
			let acc = 0;
			for (const x of domain.value) {
				const r = evaluate(e.body, new Map(env).set(e.bound, num(x)));
				acc += asNum(r);
			}
			return num(acc);
		}
	}
};

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
