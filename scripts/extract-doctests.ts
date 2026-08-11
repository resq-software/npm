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
 * @fileoverview Extracts documentation code fences out of JSDoc and emits them
 * as real Vitest files, so a documented example that stops compiling — or stops
 * being true — fails the build instead of rotting in place.
 *
 * @module scripts/extract-doctests
 *
 * **What is extracted.** Only fences whose info string is exactly
 * `ts doctest` (optionally followed by flags). A plain `ts` fence is
 * deliberately *not* extracted: that is the escape hatch for illustrative
 * snippets that reference bindings they never declare, which several file-level
 * overviews need. The extractor keys on the fence info string alone, never on
 * the surrounding tag, so `@example` stays an ordinary TSDoc tag and TypeDoc
 * keeps rendering it.
 *
 * **Import convention.** Every doctest fence must open with imports and nothing
 * else, and every specifier must be a public workspace specifier
 * (`@resq-systems/<pkg>` or `@resq-systems/<pkg>/<subpath>`) or a `node:`
 * builtin. Six rules, each a hard error naming `file:line`:
 *
 * 1. Imports come first — no code above them.
 * 2. No relative specifiers. A relative path is right where the JSDoc lives and
 *    wrong where the generated file lives, and it rots silently on a move.
 * 3. The subpath must be a key of the target package's `exports` map, so every
 *    example doubles as a proof that the symbol is reachable by a consumer.
 * 4. Symbols exported by the documenting module are imported from that module's
 *    own subpath, never from the barrel. Only fences in the barrel (`index.ts`)
 *    may use the bare package specifier.
 * 5. Cross-package specifiers only for declared `dependencies` /
 *    `peerDependencies` of the documenting package.
 * 6. Self-contained — every binding is imported or declared inside the fence.
 *
 * On emit, own-package specifiers are rewritten to relative `src` paths with
 * explicit `.js` extensions, so generated tests exercise the sources directly:
 * no build step, no self-dependency in the workspace graph, and `tsc` covers
 * them for free.
 *
 * **Opt-outs.** A whole fence is excluded either by demoting it to a plain
 * ```ts fence (illustrative, never compiled) or with the `ignore` flag
 * (`ts doctest ignore`), which stays visible in `--report` so it cannot hide. A
 * single deliberately-broken line uses TypeScript's own `@ts-expect-error`,
 * which is itself checked — the line has to actually fail to compile.
 *
 * **Assertions.** `expr // => literal` becomes
 * `expect(expr).toStrictEqual(literal)`, and `const x = expr // => literal`
 * keeps the binding and asserts on the next line. The rewrite only fires when
 * the annotation parses as a literal, so explanatory `// =>` notes are safe.
 *
 * Usage:
 *
 *     bun scripts/extract-doctests.ts --package types --write
 *     bun scripts/extract-doctests.ts --package types --check
 *     bun scripts/extract-doctests.ts --package types --typecheck
 *     bun scripts/extract-doctests.ts --package types --check --report
 */

import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

//#region Types

/** A source position, used for every error message and remapped diagnostic. */
export interface SourceLocation {
	/** Repo-relative, posix-separated path of the documenting module. */
	readonly file: string;
	/** 1-based line number in that module. */
	readonly line: number;
	/** The exported symbol the example documents, or `Module` for a file overview. */
	readonly symbol: string;
	/** The human label of the example, used as the test name. */
	readonly label: string;
}

/** One `ts doctest` fence, lifted out of a JSDoc block with its comment prefix stripped. */
export interface DoctestFence {
	readonly file: string;
	readonly moduleKey: string;
	readonly moduleSubpath: string;
	readonly symbol: string;
	readonly label: string;
	readonly fenceLine: number;
	readonly bodyStartLine: number;
	readonly body: readonly string[];
	readonly flags: readonly string[];
}

/** A single parsed import binding from a fence prologue. */
export interface DoctestImport {
	readonly specifier: string;
	readonly local: string;
	readonly imported: string;
	readonly typeOnly: boolean;
	readonly namespace: boolean;
	readonly line: number;
}

/** One convention violation. Every issue names a file, a line, and a symbol. */
export interface DoctestIssue extends SourceLocation {
	readonly message: string;
}

/** A generated `*.doctest.ts` file, plus the line map used to remap diagnostics. */
export interface GeneratedFile {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly content: string;
	/** `origins[n]` is the source location of generated line `n + 1`, when there is one. */
	readonly origins: readonly (SourceLocation | undefined)[];
	readonly fenceCount: number;
	readonly assertionCount: number;
	readonly zeroAssertionFences: number;
}

/** Per-module extraction counters, printed by `--report`. */
export interface ModuleReport {
	readonly file: string;
	readonly fences: number;
	readonly assertions: number;
	readonly zeroAssertionFences: number;
	readonly ignoredFences: number;
	readonly illustrativeFences: number;
}

/** The whole result of a generation pass: files that should exist, plus counters. */
export interface GenerationResult {
	readonly packageName: string;
	readonly packageDir: string;
	readonly outputDir: string;
	readonly files: readonly GeneratedFile[];
	readonly reports: readonly ModuleReport[];
}

/** Options for {@link generate}. */
export interface GenerateOptions {
	/** Absolute path of the workspace root (the directory holding `packages/`). */
	readonly repoRoot: string;
	/** Directory name under `packages/`, e.g. `types`. */
	readonly packageDirName: string;
}

/** A tsc diagnostic, remapped from the generated file back to the documenting module. */
export interface MappedDiagnostic {
	readonly generatedFile: string;
	readonly generatedLine: number;
	readonly origin: SourceLocation | undefined;
	readonly text: string;
	readonly rendered: string;
}

/** Aggregate failure carrying every convention violation found in one pass. */
export class DoctestError extends Error {
	public readonly issues: readonly DoctestIssue[];

	public constructor(issues: readonly DoctestIssue[]) {
		super(formatIssues(issues));
		this.name = "DoctestError";
		this.issues = issues;
	}
}

//#endregion

//#region Constants

const LICENSE_HEADER = `/**
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
 */`;

/** Where generated doctests live, relative to a package's `src`. */
export const OUTPUT_SUBDIR = join("__generated__", "doctests");

/**
 * The suffix every generated file carries. Deliberately **not** `*.test.ts`:
 * the package tsconfig excludes `src/**\/*.test.ts`, so a `.test.ts` name would
 * be skipped by both `tsc --noEmit` passes and type-checked nowhere.
 */
export const OUTPUT_SUFFIX = ".doctest.ts";

/**
 * The repo formatter's line width (`biome.json#formatter.lineWidth`). Generated
 * files are emitted already conforming, so no formatting pass is needed and
 * `biome check` stays green over them.
 */
const FORMATTER_LINE_WIDTH = 100;

/** Fence flags the extractor understands. Anything else is a hard error. */
const KNOWN_FLAGS: ReadonlySet<string> = new Set(["ignore"]);

/** Locals the generated file needs for itself; a fence may not shadow them. */
const RESERVED_LOCALS: ReadonlySet<string> = new Set(["describe", "expect", "it"]);

/** Words allowed to appear bare inside a `// =>` literal annotation. */
const LITERAL_WORDS: ReadonlySet<string> = new Set([
	"true",
	"false",
	"null",
	"undefined",
	"NaN",
	"Infinity",
]);

const IMPORT_STATEMENT =
	/^[ \t]*import[ \t]+(?:(type)[ \t]+)?(\{[\s\S]*?\}|\*[ \t]+as[ \t]+[A-Za-z_$][\w$]*)[ \t\n]*from[ \t]*["']([^"']+)["'][ \t]*;?[ \t]*$/;

const EXPORT_DECLARATION =
	/^\s*export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\s*\*?|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/;

const DECLARATION_LINE = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*.+$/;

const ASSERTION_COMMENT = /^(?<code>.*?)[ \t]*\/\/[ \t]*(?:=>|→)[ \t]*(?<expected>\S.*?)[ \t]*$/;

//#endregion

//#region Public API

/**
 * Scan every non-test module under `packages/<pkg>/src`, extract its
 * `ts doctest` fences, and render one Vitest file per module.
 *
 * @param options - Workspace root and the package directory name.
 * @returns The files that *should* be on disk, plus per-module counters.
 * @throws {DoctestError} When any fence violates the fence grammar, the import
 *   convention, or the assertion grammar. Every issue names `file:line` and the
 *   documented symbol.
 */
export function generate(options: GenerateOptions): GenerationResult {
	const { repoRoot, packageDirName } = options;
	const packageDir = resolve(repoRoot, "packages", packageDirName);
	const manifest = readManifest(packageDir);
	const workspace = readWorkspace(repoRoot);
	const srcDir = join(packageDir, "src");
	const outputDir = join(srcDir, OUTPUT_SUBDIR);

	const issues: DoctestIssue[] = [];
	const files: GeneratedFile[] = [];
	const reports: ModuleReport[] = [];

	for (const absolutePath of listSourceModules(srcDir)) {
		const relPath = toPosix(relative(repoRoot, absolutePath));
		const source = readFileSync(absolutePath, "utf8");
		const moduleKey = moduleKeyOf(srcDir, absolutePath);
		const moduleSubpath = moduleSubpathOf(srcDir, absolutePath);
		const scan = scanFences(source, relPath, moduleKey, moduleSubpath, issues);
		const exported = collectExportedNames(source);
		const active = scan.fences.filter((fence) => !fence.flags.includes("ignore"));

		const rendered =
			active.length === 0
				? undefined
				: renderModule({
						fences: active,
						manifest,
						workspace,
						srcDir,
						outputDir,
						exported,
						issues,
					});

		reports.push({
			file: relPath,
			fences: active.length,
			assertions: rendered?.assertions ?? 0,
			zeroAssertionFences: rendered?.zeroAssertionFences ?? 0,
			ignoredFences: scan.fences.length - active.length,
			illustrativeFences: scan.illustrative,
		});

		if (rendered === undefined) {
			continue;
		}

		const absolute = join(outputDir, `${moduleKey}${OUTPUT_SUFFIX}`);
		files.push({
			absolutePath: absolute,
			relativePath: toPosix(relative(repoRoot, absolute)),
			content: rendered.content,
			origins: rendered.origins,
			fenceCount: active.length,
			assertionCount: rendered.assertions,
			zeroAssertionFences: rendered.zeroAssertionFences,
		});
	}

	if (issues.length > 0) {
		throw new DoctestError(issues);
	}

	return { packageName: manifest.name, packageDir, outputDir, files, reports };
}

/**
 * Compare a generation result against what is on disk.
 *
 * @param result - The result of {@link generate}.
 * @param repoRoot - Workspace root, used to render drifted paths.
 * @returns Repo-relative paths that are missing, stale, or orphaned. Empty means in sync.
 */
export function diffAgainstDisk(result: GenerationResult, repoRoot: string): readonly string[] {
	const drifted: string[] = [];
	const expected = new Set(result.files.map((file) => file.absolutePath));

	for (const file of result.files) {
		const current = existsSync(file.absolutePath)
			? readFileSync(file.absolutePath, "utf8")
			: undefined;
		if (current !== file.content) {
			drifted.push(file.relativePath);
		}
	}

	for (const orphan of listGeneratedFiles(result.outputDir)) {
		if (!expected.has(orphan)) {
			drifted.push(toPosix(relative(repoRoot, orphan)));
		}
	}

	return drifted.sort();
}

/**
 * Write a generation result to disk and delete orphaned generated files.
 *
 * @param result - The result of {@link generate}.
 * @param repoRoot - Workspace root, used to render touched paths.
 * @returns Repo-relative paths that were written or removed.
 */
export function writeToDisk(result: GenerationResult, repoRoot: string): readonly string[] {
	const touched: string[] = [];
	const expected = new Set(result.files.map((file) => file.absolutePath));

	for (const file of result.files) {
		const current = existsSync(file.absolutePath)
			? readFileSync(file.absolutePath, "utf8")
			: undefined;
		if (current === file.content) {
			continue;
		}
		mkdirSync(dirname(file.absolutePath), { recursive: true });
		writeFileSync(file.absolutePath, file.content, "utf8");
		touched.push(file.relativePath);
	}

	for (const orphan of listGeneratedFiles(result.outputDir)) {
		if (expected.has(orphan)) {
			continue;
		}
		rmSync(orphan);
		touched.push(toPosix(relative(repoRoot, orphan)));
	}

	return touched.sort();
}

/**
 * Type-check the package with `tsc --noEmit` and rewrite any diagnostic landing
 * inside a generated doctest back to the documenting module and symbol.
 *
 * @param result - The result of {@link generate}, whose line maps are consulted.
 * @param tscPath - Path to the `tsc` binary; see {@link resolveTsc}.
 * @param tsconfig - Optional `-p` argument.
 * @returns Whether the package type-checks, the raw output, and remapped diagnostics.
 * @throws {Error} When the compiler cannot be spawned at all.
 */
export function typecheck(
	result: GenerationResult,
	tscPath: string,
	tsconfig?: string,
): {
	readonly ok: boolean;
	readonly output: string;
	readonly diagnostics: readonly MappedDiagnostic[];
} {
	const args = ["--noEmit", "--pretty", "false"];
	if (tsconfig !== undefined) {
		args.push("-p", tsconfig);
	}
	const run = spawnSync(tscPath, args, {
		cwd: result.packageDir,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	if (run.error !== undefined && run.error !== null) {
		throw run.error;
	}
	const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
	return { ok: run.status === 0, output, diagnostics: remapDiagnostics(output, result) };
}

/**
 * Turn raw `tsc --pretty false` output into diagnostics addressed by source
 * module and documented symbol.
 *
 * @param output - Raw compiler output.
 * @param result - The generation result whose line maps are consulted.
 * @returns One entry per diagnostic that landed inside a generated doctest.
 */
export function remapDiagnostics(
	output: string,
	result: GenerationResult,
): readonly MappedDiagnostic[] {
	const byPath = new Map(result.files.map((file) => [file.absolutePath, file]));
	const diagnostics: MappedDiagnostic[] = [];

	for (const line of output.split(/\r?\n/)) {
		const match = /^(?<file>[^(]+)\((?<line>\d+),(?<col>\d+)\):\s*(?<text>.+)$/.exec(line);
		if (match?.groups === undefined) {
			continue;
		}
		const absolute = resolve(result.packageDir, match.groups.file ?? "");
		const generated = byPath.get(absolute);
		if (generated === undefined) {
			continue;
		}
		const generatedLine = Number.parseInt(match.groups.line ?? "0", 10);
		const origin = generated.origins[generatedLine - 1];
		const text = match.groups.text ?? "";
		const rendered =
			origin === undefined
				? `${generated.relativePath}:${generatedLine} — ${text}`
				: [
						`${origin.file}:${origin.line} — example "${origin.label}" for \`${origin.symbol}\``,
						`    ${text}`,
						`    (generated: ${generated.relativePath}:${generatedLine})`,
					].join("\n");
		diagnostics.push({
			generatedFile: generated.relativePath,
			generatedLine,
			origin,
			text,
			rendered,
		});
	}

	return diagnostics;
}

/**
 * Locate the workspace `tsc` binary.
 *
 * @param repoRoot - Absolute workspace root.
 * @param packageDir - Absolute package directory, checked first.
 * @returns Absolute path to the binary.
 * @throws {Error} When no binary is found — silently skipping the type-check
 *   would discard half of the guarantee this harness exists to provide.
 */
export function resolveTsc(repoRoot: string, packageDir?: string): string {
	const candidates = [
		packageDir === undefined ? undefined : join(packageDir, "node_modules", ".bin", "tsc"),
		join(repoRoot, "node_modules", ".bin", "tsc"),
	].filter((candidate): candidate is string => candidate !== undefined);

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	throw new Error(`Unable to locate a tsc binary. Looked in:\n  ${candidates.join("\n  ")}`);
}

/**
 * Render a set of convention violations for a human.
 *
 * @param issues - The violations to format.
 * @returns A multi-line message, one paragraph per issue.
 */
export function formatIssues(issues: readonly DoctestIssue[]): string {
	const body = issues
		.map(
			(issue) =>
				`  ${issue.file}:${issue.line} — example "${issue.label}" for \`${issue.symbol}\`\n    ${issue.message}`,
		)
		.join("\n");
	return `${issues.length} doctest problem${issues.length === 1 ? "" : "s"}:\n${body}`;
}

//#endregion

//#region Fence scanning

/** The fences found in one module, plus how many were plain illustrative fences. */
export interface ScanResult {
	readonly fences: readonly DoctestFence[];
	readonly illustrative: number;
}

/**
 * Walk a module's JSDoc blocks and lift out every fence.
 *
 * Line-based on purpose: once the leading `' * '` is stripped, a fence is
 * unambiguous, and a real parser would buy nothing but a dependency.
 *
 * @param source - The module text.
 * @param file - Repo-relative path, used in every message.
 * @param moduleKey - Flattened module name used for the output filename.
 * @param moduleSubpath - The module's `exports` subpath key, e.g. `./predicate`.
 * @param issues - Sink for grammar violations.
 * @returns The extracted doctest fences and the count of illustrative ones.
 */
export function scanFences(
	source: string,
	file: string,
	moduleKey: string,
	moduleSubpath: string,
	issues: DoctestIssue[],
): ScanResult {
	const lines = source.split(/\r?\n/);
	const fences: DoctestFence[] = [];
	let illustrative = 0;

	for (let index = 0; index < lines.length; index += 1) {
		if (!(lines[index] ?? "").trimStart().startsWith("/**")) {
			continue;
		}

		let end = index;
		while (end < lines.length && !(lines[end] ?? "").trimEnd().endsWith("*/")) {
			end += 1;
		}
		if (end >= lines.length) {
			break;
		}

		const block = lines.slice(index, end + 1).map(stripJsdocLine);
		const isOverview = block.some((line) => line.trimStart().startsWith("@fileoverview"));
		const symbol = isOverview ? "Module" : findDocumentedSymbol(lines, end);
		const used = new Set<string>();

		for (let cursor = 0; cursor < block.length; cursor += 1) {
			const content = (block[cursor] ?? "").trim();
			if (!content.startsWith("```")) {
				continue;
			}
			const info = content.slice(3).trim();
			const tokens = info.length === 0 ? [] : info.split(/\s+/);
			const fenceLine = index + cursor + 1;

			let close = cursor + 1;
			while (close < block.length && (block[close] ?? "").trim() !== "```") {
				close += 1;
			}
			if (close >= block.length) {
				issues.push({
					file,
					line: fenceLine,
					symbol,
					label: "Example",
					message: "Unterminated code fence inside a JSDoc block.",
				});
				break;
			}

			if (tokens[0] !== "ts" || tokens[1] !== "doctest") {
				illustrative += 1;
				cursor = close;
				continue;
			}

			const flags = tokens.slice(2);
			const label = uniqueLabel(findLabel(block, cursor), used);
			for (const flag of flags) {
				if (!KNOWN_FLAGS.has(flag)) {
					issues.push({
						file,
						line: fenceLine,
						symbol,
						label,
						message: `Unknown doctest flag \`${flag}\`. Known flags: ${[...KNOWN_FLAGS].join(", ")}.`,
					});
				}
			}

			fences.push({
				file,
				moduleKey,
				moduleSubpath,
				symbol,
				label,
				fenceLine,
				bodyStartLine: fenceLine + 1,
				body: block.slice(cursor + 1, close),
				flags,
			});
			cursor = close;
		}

		index = end;
	}

	return { fences, illustrative };
}

function stripJsdocLine(line: string): string {
	const trimmed = line.replace(/^\s+/, "");
	if (trimmed.startsWith("/**")) {
		return trimmed.slice(3).replace(/\*\/\s*$/, "");
	}
	if (trimmed.startsWith("*/")) {
		return "";
	}
	if (trimmed.startsWith("*")) {
		const rest = trimmed.slice(1).replace(/\*\/\s*$/, "");
		return rest.startsWith(" ") ? rest.slice(1) : rest;
	}
	return trimmed.replace(/\*\/\s*$/, "");
}

/**
 * Find the label for a fence: the nearest preceding non-blank documentation
 * line. `**Example** (Doing the thing)` yields `Doing the thing`, a bare
 * `**Doing the thing**` yields itself, and `@example Doing the thing` yields
 * its inline text.
 *
 * @param block - The stripped JSDoc block.
 * @param fenceIndex - Index of the fence opener within that block.
 * @returns The label, or `Example` when the block offers none.
 */
function findLabel(block: readonly string[], fenceIndex: number): string {
	for (let cursor = fenceIndex - 1; cursor >= 0; cursor -= 1) {
		const line = (block[cursor] ?? "").trim();
		if (line.length === 0) {
			continue;
		}
		const bold = /^\*\*(.+?)\*\*(?:\s*\((.+)\))?$/.exec(line);
		if (bold !== null) {
			const parenthesised = (bold[2] ?? "").trim();
			const heading = (bold[1] ?? "").trim();
			return parenthesised.length > 0 ? parenthesised : heading;
		}
		const tag = /^@example\s*(.*)$/.exec(line);
		if (tag !== null) {
			const inline = (tag[1] ?? "").trim();
			return inline.length > 0 ? inline : "Example";
		}
		return "Example";
	}
	return "Example";
}

function uniqueLabel(label: string, used: Set<string>): string {
	if (!used.has(label)) {
		used.add(label);
		return label;
	}
	let counter = 2;
	while (used.has(`${label} (${counter})`)) {
		counter += 1;
	}
	const unique = `${label} (${counter})`;
	used.add(unique);
	return unique;
}

/**
 * Name the symbol a JSDoc block documents, qualified by its enclosing
 * namespace when it has one, so `Refinement.In` does not report as bare `In`.
 *
 * @param lines - The module's lines.
 * @param blockEnd - Index of the line closing the JSDoc block.
 * @returns The symbol name, or `Module` for a file overview or a re-export block.
 */
function findDocumentedSymbol(lines: readonly string[], blockEnd: number): string {
	for (let cursor = blockEnd + 1; cursor < Math.min(lines.length, blockEnd + 25); cursor += 1) {
		const line = lines[cursor] ?? "";
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("//") || trimmed.startsWith("@")) {
			continue;
		}
		const match = EXPORT_DECLARATION.exec(line);
		if (match?.[1] === undefined) {
			return "Module";
		}
		const indented = /^\s/.test(line);
		const namespace = indented ? findEnclosingNamespace(lines, cursor) : undefined;
		return namespace === undefined ? match[1] : `${namespace}.${match[1]}`;
	}
	return "Module";
}

function findEnclosingNamespace(lines: readonly string[], from: number): string | undefined {
	for (let cursor = from - 1; cursor >= 0; cursor -= 1) {
		const line = lines[cursor] ?? "";
		const match = /^(?:export\s+)?(?:declare\s+)?namespace\s+([A-Za-z_$][\w$]*)/.exec(line);
		if (match?.[1] !== undefined) {
			return match[1];
		}
	}
	return undefined;
}

function collectExportedNames(source: string): ReadonlySet<string> {
	const names = new Set<string>();
	for (const line of source.split(/\r?\n/)) {
		const match = EXPORT_DECLARATION.exec(line);
		if (match?.[1] !== undefined) {
			names.add(match[1]);
		}
	}
	return names;
}

//#endregion

//#region Rendering

interface RenderOptions {
	readonly fences: readonly DoctestFence[];
	readonly manifest: PackageManifest;
	readonly workspace: WorkspaceIndex;
	readonly srcDir: string;
	readonly outputDir: string;
	readonly exported: ReadonlySet<string>;
	readonly issues: DoctestIssue[];
}

interface RenderedModule {
	readonly content: string;
	readonly origins: readonly (SourceLocation | undefined)[];
	readonly assertions: number;
	readonly zeroAssertionFences: number;
}

interface ImportGroup {
	readonly value: Map<string, string>;
	readonly type: Map<string, string>;
	readonly namespaces: Set<string>;
	readonly origin: SourceLocation;
}

class Emitter {
	private readonly lines: string[] = [];
	private readonly map: (SourceLocation | undefined)[] = [];

	/**
	 * Append text, splitting on newlines so the line map stays 1:1 with the
	 * emitted file — a multi-line push would otherwise desynchronise every
	 * diagnostic remap after it.
	 *
	 * @param text - One or more lines.
	 * @param origin - Where they came from, when they came from an example.
	 */
	public push(text: string, origin?: SourceLocation): void {
		for (const line of text.split("\n")) {
			this.lines.push(line);
			this.map.push(origin);
		}
	}

	public get content(): string {
		return `${this.lines.join("\n")}\n`;
	}

	public get origins(): readonly (SourceLocation | undefined)[] {
		return this.map;
	}
}

/**
 * Render one module's fences into a single Vitest file, hoisting and deduping
 * imports across fences. Each fence body keeps its own `it` callback scope, so
 * only imports can collide.
 *
 * @param options - Fences, manifests, and the issue sink.
 * @returns The file text and its line map, or `undefined` when a fence failed validation.
 */
export function renderModule(options: RenderOptions): RenderedModule | undefined {
	const { fences, issues } = options;
	const groups = new Map<string, ImportGroup>();
	const owners = new Map<string, { readonly specifier: string; readonly origin: SourceLocation }>();
	const bodies: {
		readonly fence: DoctestFence;
		readonly emitted: readonly EmittedLine[];
		readonly assertions: number;
	}[] = [];
	const before = issues.length;

	for (const fence of fences) {
		const location = locationOf(fence, fence.fenceLine);
		const parsed = parseFenceBody(fence, issues);
		if (parsed === undefined) {
			continue;
		}

		for (const binding of parsed.imports) {
			const specifier = resolveSpecifier(binding, fence, options);
			if (specifier === undefined) {
				continue;
			}
			if (RESERVED_LOCALS.has(binding.local)) {
				issues.push({
					...locationOf(fence, binding.line),
					message: `\`${binding.local}\` is reserved by the generated test file. Rename the import with \`as\`.`,
				});
				continue;
			}
			const existing = owners.get(binding.local);
			if (existing !== undefined && existing.specifier !== specifier) {
				issues.push({
					...locationOf(fence, binding.line),
					message: `\`${binding.local}\` is imported from "${binding.specifier}" here and from a different specifier at ${existing.origin.file}:${existing.origin.line}. Generated doctests hoist imports per module, so one local name cannot mean two things.`,
				});
				continue;
			}
			owners.set(binding.local, { specifier, origin: locationOf(fence, binding.line) });

			const group = groups.get(specifier) ?? {
				value: new Map<string, string>(),
				type: new Map<string, string>(),
				namespaces: new Set<string>(),
				origin: location,
			};
			if (binding.namespace) {
				group.namespaces.add(binding.local);
			} else if (binding.typeOnly) {
				if (!group.value.has(binding.local)) {
					group.type.set(binding.local, binding.imported);
				}
			} else {
				group.type.delete(binding.local);
				group.value.set(binding.local, binding.imported);
			}
			groups.set(specifier, group);
		}

		const emitted = rewriteBody(fence, parsed, issues);
		bodies.push({ fence, emitted: emitted.lines, assertions: emitted.assertions });
	}

	if (issues.length > before || bodies.length === 0) {
		return undefined;
	}

	const totalAssertions = bodies.reduce((sum, entry) => sum + entry.assertions, 0);
	const zeroAssertionFences = bodies.filter((entry) => entry.assertions === 0).length;
	const sourceFile = fences[0]?.file ?? "";
	const emitter = new Emitter();

	emitter.push(LICENSE_HEADER);
	emitter.push("");
	emitter.push("/**");
	emitter.push(` * @fileoverview Generated doctests for \`${sourceFile}\`.`);
	emitter.push(" *");
	emitter.push(" * Every block below is a `ts doctest` fence lifted verbatim out of a JSDoc");
	emitter.push(" * example. Editing this file is pointless — edit the example it came from and");
	emitter.push(" * re-run the package's `doctest` script.");
	emitter.push(" */");
	emitter.push("");
	emitter.push(`// @generated by scripts/extract-doctests.ts from ${sourceFile} — DO NOT EDIT.`);
	// CODE_STYLE §10: generated code sits outside the style pass. The root biome.json
	// cannot be edited, so the opt-out is stated per file instead, which is narrower.
	emitter.push(
		"// biome-ignore-all format: generated file — example text is reproduced verbatim from its JSDoc.",
	);
	emitter.push(
		"// biome-ignore-all lint: generated file — examples bind values purely to prove they type-check.",
	);
	emitter.push("");
	emitter.push(
		totalAssertions > 0
			? 'import { describe, expect, it } from "vitest";'
			: 'import { describe, it } from "vitest";',
	);
	for (const specifier of [...groups.keys()].sort()) {
		const group = groups.get(specifier);
		if (group === undefined) {
			continue;
		}
		for (const statement of renderImportGroup(specifier, group)) {
			emitter.push(statement, group.origin);
		}
	}
	emitter.push("");
	emitter.push(`describe(${JSON.stringify(sourceFile)}, () => {`);

	for (const [position, entry] of bodies.entries()) {
		if (position > 0) {
			emitter.push("");
		}
		const location = locationOf(entry.fence, entry.fence.fenceLine);
		const asynchronous = entry.emitted.some((line) => /(^|[^.\w])await\s/.test(line.text));
		const title = `${entry.fence.symbol} — ${entry.fence.label}`;
		emitter.push(`\t// ${entry.fence.file}:${entry.fence.fenceLine}`, location);
		emitter.push(`\tit(${JSON.stringify(title)}, ${asynchronous ? "async " : ""}() => {`, location);
		if (entry.assertions > 0) {
			emitter.push("\t\texpect.hasAssertions();", location);
		}
		for (const line of entry.emitted) {
			emitter.push(line.text.trim().length === 0 ? "" : `\t\t${line.text}`, line.origin);
		}
		emitter.push("\t});", location);
	}

	emitter.push("});");

	return {
		content: emitter.content,
		origins: emitter.origins,
		assertions: totalAssertions,
		zeroAssertionFences,
	};
}

function renderImportGroup(specifier: string, group: ImportGroup): readonly string[] {
	const statements: string[] = [];
	for (const local of [...group.namespaces].sort()) {
		statements.push(`import * as ${local} from ${JSON.stringify(specifier)};`);
	}

	const entries: { readonly sortKey: string; readonly text: string }[] = [];
	for (const [local, imported] of group.type) {
		entries.push({
			sortKey: local,
			text: `type ${local === imported ? local : `${imported} as ${local}`}`,
		});
	}
	for (const [local, imported] of group.value) {
		entries.push({ sortKey: local, text: local === imported ? local : `${imported} as ${local}` });
	}
	if (entries.length > 0) {
		entries.sort((left, right) => (left.sortKey < right.sortKey ? -1 : 1));
		const names = entries.map((entry) => entry.text);
		const from = JSON.stringify(specifier);
		const single = `import { ${names.join(", ")} } from ${from};`;
		// Match the formatter's line width so generated files need no formatting pass.
		statements.push(
			single.length <= FORMATTER_LINE_WIDTH
				? single
				: `import {\n${names.map((name) => `\t${name},`).join("\n")}\n} from ${from};`,
		);
	}
	return statements;
}

function locationOf(fence: DoctestFence, line: number): SourceLocation {
	return { file: fence.file, line, symbol: fence.symbol, label: fence.label };
}

//#endregion

//#region Fence body parsing

/** A fence body split into its import prologue and its code. */
export interface ParsedFence {
	readonly imports: readonly DoctestImport[];
	readonly code: readonly { readonly text: string; readonly line: number }[];
}

/**
 * Split a fence body into imports and code, enforcing "imports first".
 *
 * @param fence - The fence to parse.
 * @param issues - Sink for violations.
 * @returns The parsed body, or `undefined` when the fence is unusable.
 */
export function parseFenceBody(
	fence: DoctestFence,
	issues: DoctestIssue[],
): ParsedFence | undefined {
	const imports: DoctestImport[] = [];
	const code: { text: string; line: number }[] = [];
	let cursor = 0;
	let prologue = true;

	while (cursor < fence.body.length) {
		const text = fence.body[cursor] ?? "";
		const line = fence.bodyStartLine + cursor;

		if (prologue && text.trim().length === 0) {
			cursor += 1;
			continue;
		}

		if (text.trimStart().startsWith("import")) {
			if (!prologue) {
				issues.push({
					...locationOf(fence, line),
					message:
						"Imports must come first in a doctest fence — nothing but imports may appear above them.",
				});
				return undefined;
			}
			let statement = text;
			let span = 1;
			while (
				parseImportStatement(statement, line) === undefined &&
				cursor + span < fence.body.length &&
				span < 20
			) {
				statement = `${statement}\n${fence.body[cursor + span] ?? ""}`;
				span += 1;
			}
			const parsed = parseImportStatement(statement, line);
			if (parsed === undefined) {
				issues.push({
					...locationOf(fence, line),
					message: `Unsupported import form: ${text.trim()} — use \`import { a, b } from "@resq-systems/<pkg>/<subpath>";\`, an \`import type\`, or \`import * as ns\`. Default and side-effect imports are not allowed.`,
				});
				return undefined;
			}
			imports.push(...parsed);
			cursor += span;
			continue;
		}

		prologue = false;
		code.push({ text, line });
		cursor += 1;
	}

	while (code.length > 0 && (code[code.length - 1]?.text ?? "").trim().length === 0) {
		code.pop();
	}

	if (code.length === 0) {
		issues.push({
			...locationOf(fence, fence.fenceLine),
			message:
				"Doctest fence has no code after its imports. Add a body, or demote the fence to a plain `ts` fence if it is only illustrative.",
		});
		return undefined;
	}

	return { imports, code };
}

function parseImportStatement(
	statement: string,
	line: number,
): readonly DoctestImport[] | undefined {
	const match = IMPORT_STATEMENT.exec(statement.replace(/\r/g, "").trim());
	if (match === null) {
		return undefined;
	}
	const typeOnly = match[1] === "type";
	const clause = (match[2] ?? "").trim();
	const specifier = match[3] ?? "";

	if (clause.startsWith("*")) {
		const local = clause.replace(/^\*\s*as\s*/, "").trim();
		return [{ specifier, local, imported: "*", typeOnly, namespace: true, line }];
	}

	const inner = clause.replace(/^\{/, "").replace(/\}$/, "");
	const bindings: DoctestImport[] = [];
	for (const piece of inner.split(",")) {
		const entry = piece.trim();
		if (entry.length === 0) {
			continue;
		}
		const inlineType = /^type\s+/.test(entry);
		const rest = entry.replace(/^type\s+/, "");
		const [importedRaw, localRaw] = rest.split(/\s+as\s+/);
		const imported = (importedRaw ?? "").trim();
		const local = (localRaw ?? imported).trim();
		if (!/^[A-Za-z_$][\w$]*$/.test(imported) || !/^[A-Za-z_$][\w$]*$/.test(local)) {
			return undefined;
		}
		bindings.push({
			specifier,
			local,
			imported,
			typeOnly: typeOnly || inlineType,
			namespace: false,
			line,
		});
	}
	return bindings.length > 0 ? bindings : undefined;
}

//#endregion

//#region Import convention

/**
 * Validate one import binding against the six-rule convention and return the
 * specifier the generated file should use.
 *
 * @param binding - The binding to validate.
 * @param fence - The fence it came from.
 * @param options - Render options carrying the manifests and the issue sink.
 * @returns The rewritten specifier, or `undefined` when the binding is rejected.
 */
function resolveSpecifier(
	binding: DoctestImport,
	fence: DoctestFence,
	options: RenderOptions,
): string | undefined {
	const { manifest, workspace, srcDir, outputDir, exported, issues } = options;
	const specifier = binding.specifier;
	const location = locationOf(fence, binding.line);
	const ownSpecifier = `${manifest.name}${fence.moduleSubpath === "." ? "" : fence.moduleSubpath.replace(/^\./, "")}`;

	if (specifier.startsWith("node:")) {
		return specifier;
	}

	if (specifier.startsWith(".") || specifier.startsWith("/")) {
		issues.push({
			...location,
			message: `Relative import "${specifier}" is not allowed — a doctest is copy-pasteable consumer code. Import from the public specifier, e.g. "${ownSpecifier}".`,
		});
		return undefined;
	}

	const target = parsePackageSpecifier(specifier);
	if (target === undefined) {
		issues.push({
			...location,
			message: `Import specifier "${specifier}" is neither a \`node:\` builtin nor a \`@scope/<pkg>[/<subpath>]\` specifier.`,
		});
		return undefined;
	}

	if (target.packageName !== manifest.name) {
		const declared =
			manifest.dependencies.has(target.packageName) ||
			manifest.peerDependencies.has(target.packageName);
		if (!declared) {
			issues.push({
				...location,
				message: `"${target.packageName}" is not a dependency or peer dependency of ${manifest.name}, so a consumer following this example could not resolve it.`,
			});
			return undefined;
		}
		const other = workspace.get(target.packageName);
		if (other !== undefined && !other.exports.has(target.subpath)) {
			issues.push({
				...location,
				message: `"${specifier}" is not an export of ${target.packageName}. Its exports map has: ${[...other.exports.keys()].join(", ")}.`,
			});
			return undefined;
		}
		return specifier;
	}

	const entry = manifest.exports.get(target.subpath);
	if (entry === undefined) {
		issues.push({
			...location,
			message: `"${specifier}" is not a key of ${manifest.name}'s exports map (it has: ${[...manifest.exports.keys()].join(", ")}). Add the subpath to package.json#exports, or import from one that exists.`,
		});
		return undefined;
	}

	const documentsBarrel = fence.moduleSubpath === ".";
	if (target.subpath === "." && !documentsBarrel) {
		issues.push({
			...location,
			message: `A fence in this module must import from its own subpath "${ownSpecifier}", not from the barrel "${manifest.name}". Only fences in the barrel itself may use the bare specifier.`,
		});
		return undefined;
	}

	if (!documentsBarrel && target.subpath !== fence.moduleSubpath && !binding.namespace) {
		if (exported.has(binding.imported)) {
			issues.push({
				...location,
				message: `\`${binding.imported}\` is exported by this module, so it must be imported from "${ownSpecifier}", not from "${specifier}".`,
			});
			return undefined;
		}
	}

	return relativeSpecifier(entry, srcDir, outputDir);
}

function parsePackageSpecifier(
	specifier: string,
): { readonly packageName: string; readonly subpath: string } | undefined {
	if (!specifier.startsWith("@")) {
		return undefined;
	}
	const segments = specifier.split("/");
	if (segments.length < 2) {
		return undefined;
	}
	const packageName = `${segments[0]}/${segments[1]}`;
	const rest = segments.slice(2).join("/");
	return { packageName, subpath: rest.length === 0 ? "." : `./${rest}` };
}

function relativeSpecifier(exportTarget: string, srcDir: string, outputDir: string): string {
	const withoutLib = exportTarget.replace(/^\.\//, "").replace(/^lib\//, "");
	const sourceFile = join(srcDir, withoutLib.replace(/\.js$/, ".ts"));
	const rel = toPosix(relative(outputDir, sourceFile)).replace(/\.ts$/, ".js");
	return rel.startsWith(".") ? rel : `./${rel}`;
}

//#endregion

//#region Assertion rewriting

interface EmittedLine {
	readonly text: string;
	readonly origin: SourceLocation;
}

interface RewriteResult {
	readonly lines: readonly EmittedLine[];
	readonly assertions: number;
}

/**
 * Rewrite `// =>` result annotations into real assertions, leaving anything
 * that is not a literal exactly as it was.
 *
 * @param fence - The fence being rendered.
 * @param parsed - Its parsed body.
 * @returns The lines to emit inside the `it` callback and how many assert.
 */
export function rewriteBody(
	fence: DoctestFence,
	parsed: ParsedFence,
	issues: DoctestIssue[],
): RewriteResult {
	const lines: EmittedLine[] = [];
	let assertions = 0;

	for (const entry of parsed.code) {
		const origin = locationOf(fence, entry.line);
		const ambient = rewriteAmbientDeclaration(entry.text, { ...origin }, issues);
		if (ambient !== undefined) {
			lines.push({ text: ambient, origin });
			continue;
		}
		const rewrite = rewriteLine(entry.text);
		if (rewrite === undefined) {
			lines.push({ text: entry.text, origin });
			continue;
		}
		for (const text of rewrite.lines) {
			lines.push({ text, origin });
		}
		assertions += rewrite.assertions;
	}

	return { lines, assertions };
}

/**
 * Turn an ambient declaration into a typed stub.
 *
 * `declare const x: T;` is the standard documentation idiom for "assume you
 * have one of these", but a modifier cannot appear inside a function body, and
 * every fence body becomes an `it` callback. The stub keeps the *type* exactly
 * and gives the binding a runtime value of `undefined`, which is the honest
 * outcome: a type-level example compiles and passes, while an example that
 * actually calls the stub fails loudly instead of pretending to have run.
 *
 * @param text - The source line.
 * @param origin - Where the line came from, for the issue message.
 * @param issues - Sink for unsupported ambient forms.
 * @returns The replacement line, or `undefined` when the line is not ambient.
 */
export function rewriteAmbientDeclaration(
	text: string,
	origin: SourceLocation,
	issues: DoctestIssue[],
): string | undefined {
	const trimmed = text.trim();
	if (!trimmed.startsWith("declare ")) {
		return undefined;
	}
	const indent = /^[ \t]*/.exec(text)?.[0] ?? "";
	const binding = /^declare\s+(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*(.+?);?$/.exec(trimmed);
	if (binding?.[2] !== undefined && binding[3] !== undefined) {
		return `${indent}const ${binding[2]} = undefined as unknown as ${binding[3]};`;
	}
	issues.push({
		...origin,
		message: `\`${trimmed}\` cannot be emitted inside a generated test body. Use \`declare const name: <type>;\` — including for functions, as \`declare const fn: (value: A) => B;\`.`,
	});
	return undefined;
}

/**
 * Rewrite a single annotated line.
 *
 * @param text - The source line.
 * @returns The replacement lines and assertion count, or `undefined` to keep the line verbatim.
 */
export function rewriteLine(
	text: string,
): { readonly lines: readonly string[]; readonly assertions: number } | undefined {
	const match = ASSERTION_COMMENT.exec(text);
	if (match?.groups === undefined) {
		return undefined;
	}
	const indent = /^[ \t]*/.exec(text)?.[0] ?? "";
	const code = (match.groups.code ?? "").trim();
	const expected = (match.groups.expected ?? "").trim();
	if (code.length === 0 || !isLiteralExpression(expected)) {
		return undefined;
	}

	const statement = code.replace(/;$/, "").trim();
	if (/^(?:type|interface|import|export|declare)\b/.test(statement)) {
		return undefined;
	}

	const declaration = DECLARATION_LINE.exec(statement);
	if (declaration?.[1] !== undefined) {
		return {
			lines: [
				`${indent}${statement};`,
				`${indent}expect(${declaration[1]}).toStrictEqual(${expected});`,
			],
			assertions: 1,
		};
	}

	if (!isCompleteExpression(statement)) {
		return undefined;
	}

	return { lines: [`${indent}expect(${statement}).toStrictEqual(${expected});`], assertions: 1 };
}

function isCompleteExpression(statement: string): boolean {
	if (/[,+\-*/&|=<>({[.:?]$/.test(statement)) {
		return false;
	}
	if (/^(?:if|for|while|switch|return|throw|else|do|try|catch|finally)\b/.test(statement)) {
		return false;
	}
	return isBalanced(statement);
}

function isBalanced(text: string): boolean {
	const stack: string[] = [];
	const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
	let quote: string | undefined;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index] ?? "";
		if (quote !== undefined) {
			if (char === "\\") {
				index += 1;
			} else if (char === quote) {
				quote = undefined;
			}
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			continue;
		}
		if (char === "(" || char === "[" || char === "{") {
			stack.push(char);
			continue;
		}
		if (char === ")" || char === "]" || char === "}") {
			if (stack.pop() !== pairs[char]) {
				return false;
			}
		}
	}
	return quote === undefined && stack.length === 0;
}

/**
 * Decide whether a `// =>` annotation is a literal we may assert on.
 *
 * Only literal tokens are accepted — strings, numbers, bigints, `true`,
 * `false`, `null`, `undefined`, `NaN`, `Infinity`, arrays, and object literals
 * whose keys are identifiers or strings. Anything else (a type, a call, prose)
 * stays an ordinary comment, which is what keeps explanatory `// =>` notes and
 * type annotations safe from a bogus rewrite.
 *
 * @param text - The annotation text.
 * @returns `true` when the text may be spliced into `toStrictEqual(...)`.
 */
export function isLiteralExpression(text: string): boolean {
	const trimmed = text.trim();
	if (trimmed.length === 0 || !isBalanced(trimmed)) {
		return false;
	}
	if (/^-?\d[\d_]*n$/.test(trimmed)) {
		return true;
	}

	let index = 0;
	let sawToken = false;

	while (index < trimmed.length) {
		const char = trimmed[index] ?? "";
		if (/\s/.test(char)) {
			index += 1;
			continue;
		}
		if (char === '"' || char === "'") {
			index += 1;
			while (index < trimmed.length && trimmed[index] !== char) {
				index += trimmed[index] === "\\" ? 2 : 1;
			}
			if (index >= trimmed.length) {
				return false;
			}
			index += 1;
			sawToken = true;
			continue;
		}
		if ("{}[],:".includes(char)) {
			index += 1;
			continue;
		}
		if (/[-\d]/.test(char)) {
			const number = /^-?\d[\d_]*(?:\.\d[\d_]*)?(?:e[+-]?\d+)?/i.exec(trimmed.slice(index));
			if (number === null) {
				return false;
			}
			index += number[0].length;
			sawToken = true;
			continue;
		}
		const word = /^[A-Za-z_$][\w$]*/.exec(trimmed.slice(index));
		if (word !== null) {
			const isKey = trimmed
				.slice(index + word[0].length)
				.trimStart()
				.startsWith(":");
			if (!isKey && !LITERAL_WORDS.has(word[0])) {
				return false;
			}
			index += word[0].length;
			sawToken = true;
			continue;
		}
		return false;
	}

	return sawToken;
}

//#endregion

//#region Workspace inspection

interface PackageManifest {
	readonly name: string;
	readonly exports: ReadonlyMap<string, string>;
	readonly dependencies: ReadonlySet<string>;
	readonly peerDependencies: ReadonlySet<string>;
}

type WorkspaceIndex = ReadonlyMap<string, PackageManifest>;

function readManifest(packageDir: string): PackageManifest {
	const raw: unknown = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
	if (typeof raw !== "object" || raw === null) {
		throw new Error(`Malformed package.json in ${packageDir}`);
	}
	const record = raw as Record<string, unknown>;
	const exportsMap = new Map<string, string>();
	const exportsField = record.exports;
	if (typeof exportsField === "object" && exportsField !== null) {
		for (const [key, value] of Object.entries(exportsField as Record<string, unknown>)) {
			const target = resolveExportTarget(value);
			if (target !== undefined) {
				exportsMap.set(key, target);
			}
		}
	}
	return {
		name: typeof record.name === "string" ? record.name : "",
		exports: exportsMap,
		dependencies: new Set(Object.keys((record.dependencies as object | undefined) ?? {})),
		peerDependencies: new Set(Object.keys((record.peerDependencies as object | undefined) ?? {})),
	};
}

function resolveExportTarget(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value !== "object" || value === null) {
		return undefined;
	}
	const record = value as Record<string, unknown>;
	for (const key of ["import", "default", "types"]) {
		const candidate = record[key];
		if (typeof candidate === "string") {
			return candidate;
		}
	}
	return undefined;
}

function readWorkspace(repoRoot: string): WorkspaceIndex {
	const index = new Map<string, PackageManifest>();
	const packagesDir = join(repoRoot, "packages");
	if (!existsSync(packagesDir)) {
		return index;
	}
	for (const entry of readdirSync(packagesDir)) {
		if (!existsSync(join(packagesDir, entry, "package.json"))) {
			continue;
		}
		const manifest = readManifest(join(packagesDir, entry));
		if (manifest.name.length > 0) {
			index.set(manifest.name, manifest);
		}
	}
	return index;
}

function listSourceModules(srcDir: string): readonly string[] {
	const found: string[] = [];
	const walk = (dir: string): void => {
		for (const entry of readdirSync(dir).sort()) {
			const absolute = join(dir, entry);
			if (statSync(absolute).isDirectory()) {
				if (entry !== "__generated__") {
					walk(absolute);
				}
				continue;
			}
			if (!entry.endsWith(".ts") || entry.endsWith(".d.ts")) {
				continue;
			}
			if (entry.endsWith(".test.ts") || entry.endsWith(".test-d.ts")) {
				continue;
			}
			if (entry.endsWith(OUTPUT_SUFFIX)) {
				continue;
			}
			found.push(absolute);
		}
	};
	if (existsSync(srcDir)) {
		walk(srcDir);
	}
	return found;
}

function listGeneratedFiles(outputDir: string): readonly string[] {
	if (!existsSync(outputDir)) {
		return [];
	}
	return readdirSync(outputDir)
		.filter((entry) => entry.endsWith(OUTPUT_SUFFIX))
		.map((entry) => join(outputDir, entry))
		.sort();
}

function moduleKeyOf(srcDir: string, absolutePath: string): string {
	return toPosix(relative(srcDir, absolutePath)).replace(/\.ts$/, "").split("/").join("-");
}

function moduleSubpathOf(srcDir: string, absolutePath: string): string {
	const rel = toPosix(relative(srcDir, absolutePath)).replace(/\.ts$/, "");
	return rel === "index" ? "." : `./${rel}`;
}

function toPosix(value: string): string {
	return sep === "/" ? value : value.split(sep).join("/");
}

//#endregion

//#region CLI

interface CliOptions {
	readonly packageDirName: string;
	readonly write: boolean;
	readonly check: boolean;
	readonly typecheck: boolean;
	readonly report: boolean;
}

function parseArgv(argv: readonly string[]): CliOptions {
	let packageDirName = "types";
	let write = false;
	let check = false;
	let typecheckMode = false;
	let report = false;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--package" || arg === "-p") {
			index += 1;
			packageDirName = argv[index] ?? packageDirName;
		} else if (arg === "--write") {
			write = true;
		} else if (arg === "--check") {
			check = true;
		} else if (arg === "--typecheck") {
			typecheckMode = true;
		} else if (arg === "--report") {
			report = true;
		} else if (arg !== undefined && arg.length > 0) {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return {
		packageDirName,
		write: write || (!check && !typecheckMode),
		check,
		typecheck: typecheckMode,
		report,
	};
}

function printReport(result: GenerationResult): void {
	console.log(`\n${result.packageName} doctests`);
	for (const report of result.reports) {
		if (report.fences === 0 && report.ignoredFences === 0 && report.illustrativeFences === 0) {
			continue;
		}
		console.log(
			`  ${report.file}: ${report.fences} fence(s), ${report.assertions} assertion(s), ` +
				`${report.zeroAssertionFences} without assertions, ${report.ignoredFences} ignored, ` +
				`${report.illustrativeFences} illustrative`,
		);
	}
}

function main(argv: readonly string[]): number {
	const options = parseArgv(argv);
	const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
	const fixCommand = `bun --filter @resq-systems/${options.packageDirName} doctest`;

	let result: GenerationResult;
	try {
		result = generate({ repoRoot, packageDirName: options.packageDirName });
	} catch (error) {
		if (error instanceof DoctestError) {
			console.error(error.message);
			return 1;
		}
		throw error;
	}

	if (options.write) {
		const touched = writeToDisk(result, repoRoot);
		for (const path of touched) {
			console.log(`updated ${path}`);
		}
		console.log(
			`${result.files.length} generated doctest file(s); ${touched.length} changed on disk.`,
		);
	}

	if (options.check || options.typecheck) {
		const drift = diffAgainstDisk(result, repoRoot);
		if (drift.length > 0) {
			console.error(
				`Generated doctests are out of date:\n${drift.map((path) => `  ${path}`).join("\n")}\n\nRun \`${fixCommand}\` and commit the result.`,
			);
			return 1;
		}
	}

	if (options.typecheck) {
		const outcome = typecheck(result, resolveTsc(repoRoot, result.packageDir));
		if (!outcome.ok) {
			if (outcome.diagnostics.length > 0) {
				console.error("\nBroken @example blocks:\n");
				for (const diagnostic of outcome.diagnostics) {
					console.error(`  ${diagnostic.rendered}\n`);
				}
			} else {
				console.error("\nNo example broke — the package itself does not type-check:\n");
			}
			console.error(outcome.output);
			return 1;
		}
	}

	if (options.report) {
		printReport(result);
	}

	return 0;
}

if (import.meta.main === true) {
	process.exitCode = main(process.argv.slice(2));
}

//#endregion
