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

// Tests for the doctest harness that guards this package's `@example` blocks.
// The harness itself lives at scripts/extract-doctests.ts; it is exercised from
// here because this is the package whose examples it protects.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { DoctestIssue } from "../../../scripts/extract-doctests.js";
import {
	diffAgainstDisk,
	DoctestError,
	generate,
	isLiteralExpression,
	resolveTsc,
	rewriteAmbientDeclaration,
	rewriteLine,
	scanFences,
	typecheck,
	writeToDisk,
} from "../../../scripts/extract-doctests.js";

//#region Fixture plumbing

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const roots: string[] = [];

/**
 * Materialise a throwaway workspace containing a single package.
 *
 * @param files - Package-relative paths mapped to file contents.
 * @returns The temporary workspace root; the package lives at `packages/widget`.
 */
function fixture(files: Readonly<Record<string, string>>): string {
	const root = mkdtempSync(join(tmpdir(), "resq-doctest-"));
	roots.push(root);
	const packageDir = join(root, "packages", "widget");

	const defaults: Record<string, string> = {
		"package.json": JSON.stringify(
			{
				name: "@resq-systems/widget",
				version: "0.0.0",
				type: "module",
				exports: {
					".": { types: "./lib/index.d.ts", import: "./lib/index.js" },
					"./widget": { types: "./lib/widget.d.ts", import: "./lib/widget.js" },
				},
			},
			null,
			"\t",
		),
		"tsconfig.json": JSON.stringify(
			{
				compilerOptions: {
					target: "ES2022",
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
					noEmit: true,
					skipLibCheck: true,
					types: [],
				},
				include: ["src"],
			},
			null,
			"\t",
		),
		// A minimal `vitest` so the generated file's import resolves without an install.
		"node_modules/vitest/package.json": JSON.stringify({
			name: "vitest",
			version: "0.0.0",
			types: "./index.d.ts",
			exports: { ".": { types: "./index.d.ts", import: "./index.js" } },
		}),
		"node_modules/vitest/index.d.ts": [
			"export declare function describe(name: string, fn: () => void): void;",
			"export declare function it(name: string, fn: () => void | Promise<void>): void;",
			"interface Assertion { toStrictEqual(expected: unknown): void }",
			"interface ExpectFn { (value: unknown): Assertion; hasAssertions(): void }",
			"export declare const expect: ExpectFn;",
			"",
		].join("\n"),
	};

	for (const [path, content] of Object.entries({ ...defaults, ...files })) {
		const absolute = join(packageDir, path);
		mkdirSync(dirname(absolute), { recursive: true });
		writeFileSync(absolute, content, "utf8");
	}

	return root;
}

/**
 * Build a documented module out of a fence body.
 *
 * @param body - The fence's lines, as they would appear inside the fence.
 * @param declaration - The exported declaration the JSDoc documents.
 * @returns Module text with the body embedded in a `ts doctest` fence.
 */
function documented(body: readonly string[], declaration: string): string {
	return [
		"/**",
		" * Doubles a number.",
		" *",
		" * **Example** (Doubling a number)",
		" *",
		" * ```ts doctest",
		...body.map((line) => (line.length === 0 ? " *" : ` * ${line}`)),
		" * ```",
		" */",
		declaration,
		"",
	].join("\n");
}

const DOUBLE = "export const double = (value: number): number => value * 2;";

afterAll(() => {
	for (const root of roots) {
		rmSync(root, { recursive: true, force: true });
	}
});

//#endregion

//#region Fence grammar

describe("scanFences", () => {
	it("extracts `ts doctest` fences and leaves plain `ts` fences alone", () => {
		const issues: DoctestIssue[] = [];
		const source = [
			"/**",
			" * **Example** (Combining two guards)",
			" *",
			" * ```ts doctest",
			" * const doubled = 2;",
			" * ```",
			" *",
			" * ```ts",
			" * whateverUndeclaredThing();",
			" * ```",
			" */",
			DOUBLE,
		].join("\n");

		const result = scanFences(source, "src/widget.ts", "widget", "./widget", issues);

		expect(issues).toStrictEqual([]);
		expect(result.illustrative).toBe(1);
		expect(result.fences).toHaveLength(1);
		expect(result.fences[0]?.symbol).toBe("double");
		expect(result.fences[0]?.label).toBe("Combining two guards");
		expect(result.fences[0]?.body).toStrictEqual(["const doubled = 2;"]);
	});

	it("keeps an `ignore` fence visible but does not emit it", () => {
		const issues: DoctestIssue[] = [];
		const source = [
			"/**",
			" * @example",
			" * ```ts doctest ignore",
			" * const broken = 1;",
			" * ```",
			" */",
			DOUBLE,
		].join("\n");

		const result = scanFences(source, "src/widget.ts", "widget", "./widget", issues);

		expect(issues).toStrictEqual([]);
		expect(result.fences[0]?.flags).toStrictEqual(["ignore"]);
	});

	it("rejects an unknown fence flag with the source position", () => {
		const issues: DoctestIssue[] = [];
		const source = [
			"/**",
			" * **Example** (Doing a thing)",
			" *",
			" * ```ts doctest skipme",
			" * const value = 1;",
			" * ```",
			" */",
			DOUBLE,
		].join("\n");

		scanFences(source, "src/widget.ts", "widget", "./widget", issues);

		expect(issues).toHaveLength(1);
		expect(issues[0]?.line).toBe(4);
		expect(issues[0]?.symbol).toBe("double");
		expect(issues[0]?.message).toContain("Unknown doctest flag");
	});
});

//#endregion

//#region Assertion rewriting

describe("assertion rewriting", () => {
	it("accepts literal annotations and refuses prose ones", () => {
		expect(isLiteralExpression("true")).toBe(true);
		expect(isLiteralExpression("-1.5")).toBe(true);
		expect(isLiteralExpression('{ ok: true, value: "x" }')).toBe(true);
		expect(isLiteralExpression('["a", "b"]')).toBe(true);
		expect(isLiteralExpression("42n")).toBe(true);
		expect(isLiteralExpression("the first matching handler")).toBe(false);
		expect(isLiteralExpression('Refinement<"cat", "dog">')).toBe(false);
		expect(isLiteralExpression("double(2)")).toBe(false);
	});

	it("asserts on an expression and keeps a declaration's binding", () => {
		expect(rewriteLine("double(2) // => 4")).toStrictEqual({
			lines: ["expect(double(2)).toStrictEqual(4);"],
			assertions: 1,
		});
		expect(rewriteLine("const total = double(2); // => 4")).toStrictEqual({
			lines: ["const total = double(2);", "expect(total).toStrictEqual(4);"],
			assertions: 1,
		});
	});

	it("turns an ambient declaration into a typed stub", () => {
		const issues: DoctestIssue[] = [];
		const origin = { file: "src/widget.ts", line: 7, symbol: "double", label: "Doubling" };

		expect(
			rewriteAmbientDeclaration("declare const isCat: Refinement<A, B>;", origin, issues),
		).toBe("const isCat = undefined as unknown as Refinement<A, B>;");
		expect(rewriteAmbientDeclaration("const plain = 1;", origin, issues)).toBe(undefined);
		expect(issues).toStrictEqual([]);

		expect(
			rewriteAmbientDeclaration("declare function f(a: number): string;", origin, issues),
		).toBe(undefined);
		expect(issues[0]?.message).toContain("declare const name");
	});

	it("leaves an explanatory annotation as a comment", () => {
		expect(rewriteLine("const guard = or(isString, isNumber); // => a reusable guard")).toBe(
			undefined,
		);
		expect(rewriteLine("type A = Not<true>; // => false")).toBe(undefined);
	});
});

//#endregion

//#region Import convention

describe("import convention", () => {
	it("rejects a relative import and names the file, line, and symbol", () => {
		const root = fixture({
			"src/widget.ts": documented(
				['import { double } from "./widget.js";', "", "double(2); // => 4"],
				DOUBLE,
			),
		});

		expect(() => generate({ repoRoot: root, packageDirName: "widget" })).toThrowError(DoctestError);

		try {
			generate({ repoRoot: root, packageDirName: "widget" });
			expect.unreachable("expected a DoctestError");
		} catch (error) {
			const issues = (error as DoctestError).issues;
			expect(issues[0]?.file).toBe("packages/widget/src/widget.ts");
			expect(issues[0]?.symbol).toBe("double");
			expect(issues[0]?.message).toContain("Relative import");
			expect(issues[0]?.message).toContain("@resq-systems/widget/widget");
		}
	});

	it("rejects the barrel specifier inside a non-barrel module", () => {
		const root = fixture({
			"src/widget.ts": documented(
				['import { double } from "@resq-systems/widget";', "", "double(2); // => 4"],
				DOUBLE,
			),
		});

		try {
			generate({ repoRoot: root, packageDirName: "widget" });
			expect.unreachable("expected a DoctestError");
		} catch (error) {
			expect((error as DoctestError).issues[0]?.message).toContain("its own subpath");
		}
	});

	it("rejects a subpath that is not in the exports map", () => {
		const root = fixture({
			"src/widget.ts": documented(
				['import { double } from "@resq-systems/widget/gadget";', "", "double(2); // => 4"],
				DOUBLE,
			),
		});

		try {
			generate({ repoRoot: root, packageDirName: "widget" });
			expect.unreachable("expected a DoctestError");
		} catch (error) {
			expect((error as DoctestError).issues[0]?.message).toContain("exports map");
		}
	});

	it("rejects a package that is not a declared dependency", () => {
		const root = fixture({
			"src/widget.ts": documented(
				['import { Effect } from "@effect/platform";', "", "double(2); // => 4"],
				DOUBLE,
			),
		});

		try {
			generate({ repoRoot: root, packageDirName: "widget" });
			expect.unreachable("expected a DoctestError");
		} catch (error) {
			expect((error as DoctestError).issues[0]?.message).toContain("not a dependency");
		}
	});

	it("rejects code above the imports", () => {
		const root = fixture({
			"src/widget.ts": documented(
				["const before = 1;", 'import { double } from "@resq-systems/widget/widget";'],
				DOUBLE,
			),
		});

		try {
			generate({ repoRoot: root, packageDirName: "widget" });
			expect.unreachable("expected a DoctestError");
		} catch (error) {
			expect((error as DoctestError).issues[0]?.message).toContain("Imports must come first");
		}
	});

	it("rewrites a valid public specifier to a relative source path", () => {
		const root = fixture({
			"src/widget.ts": documented(
				['import { double } from "@resq-systems/widget/widget";', "", "double(2); // => 4"],
				DOUBLE,
			),
		});

		const result = generate({ repoRoot: root, packageDirName: "widget" });

		expect(result.files).toHaveLength(1);
		expect(result.files[0]?.content).toContain('import { double } from "../../widget.js";');
		expect(result.files[0]?.content).toContain('it("double — Doubling a number", () => {');
		expect(result.files[0]?.content).toContain("expect.hasAssertions();");
		expect(result.files[0]?.content).toContain("expect(double(2)).toStrictEqual(4);");
	});
});

//#endregion

//#region Drift detection

describe("drift detection", () => {
	it("reports a hand-edited generated file and prunes an orphan", () => {
		const root = fixture({
			"src/widget.ts": documented(
				['import { double } from "@resq-systems/widget/widget";', "", "double(2); // => 4"],
				DOUBLE,
			),
		});

		const result = generate({ repoRoot: root, packageDirName: "widget" });
		writeToDisk(result, root);
		expect(diffAgainstDisk(result, root)).toStrictEqual([]);

		const generated = result.files[0]?.absolutePath ?? "";
		writeFileSync(generated, `${readFileSync(generated, "utf8")}\n// hand edit\n`, "utf8");
		expect(diffAgainstDisk(result, root)).toStrictEqual([
			"packages/widget/src/__generated__/doctests/widget.doctest.ts",
		]);

		const orphan = join(dirname(generated), "gone.doctest.ts");
		writeFileSync(orphan, "// stale\n", "utf8");
		expect(diffAgainstDisk(result, root)).toContain(
			"packages/widget/src/__generated__/doctests/gone.doctest.ts",
		);

		writeToDisk(result, root);
		expect(diffAgainstDisk(result, root)).toStrictEqual([]);
	});
});

//#endregion

//#region The point of the whole exercise

describe("a broken example fails the run", () => {
	it("reports a type error in an @example against its source file and symbol", {
		timeout: 120_000,
	}, () => {
		const root = fixture({
			"src/widget.ts": documented(
				[
					'import { double } from "@resq-systems/widget/widget";',
					"",
					// `double` takes a number. Passing a string is the deliberate rot.
					'double("two"); // => 4',
				],
				DOUBLE,
			),
		});

		const result = generate({ repoRoot: root, packageDirName: "widget" });
		writeToDisk(result, root);

		const outcome = typecheck(result, resolveTsc(REPO_ROOT));

		expect(outcome.ok).toBe(false);
		const broken = outcome.diagnostics.find((entry) => entry.origin !== undefined);
		expect(broken?.origin?.file).toBe("packages/widget/src/widget.ts");
		expect(broken?.origin?.symbol).toBe("double");
		expect(broken?.origin?.label).toBe("Doubling a number");
		expect(broken?.text).toContain("error TS2345");
		expect(broken?.rendered).toContain("packages/widget/src/widget.ts:");
		expect(broken?.rendered).toContain('example "Doubling a number" for `double`');
	});

	it("type-checks cleanly once the example is correct", { timeout: 120_000 }, () => {
		const root = fixture({
			"src/widget.ts": documented(
				['import { double } from "@resq-systems/widget/widget";', "", "double(2); // => 4"],
				DOUBLE,
			),
		});

		const result = generate({ repoRoot: root, packageDirName: "widget" });
		writeToDisk(result, root);

		const outcome = typecheck(result, resolveTsc(REPO_ROOT));

		expect(outcome.output).toBe("");
		expect(outcome.ok).toBe(true);
	});
});

//#endregion
