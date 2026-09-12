#!/usr/bin/env bun

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
 * Dependency graph reporter — classifies every installed package as direct or
 * transitive using npm's Arborist, which models the logical dependency graph
 * overlaid on the physical `node_modules` tree. Because npm and bun both hoist
 * and dedupe, presence in `node_modules` says nothing about how a package was
 * introduced; only the edges do.
 *
 * Workspace-aware: this is a monorepo, so the project surface is the root
 * *plus* every `packages/*` and `examples/*` node. A dependency declared by
 * `@resq-systems/security` is direct for that package, not transitive.
 *
 * Usage:
 *   bun scripts/dependencies.ts                  # full report for this workspace
 *   bun scripts/dependencies.ts ../other-repo    # report for another project
 *   bun scripts/dependencies.ts --direct         # only direct dependencies
 *   bun scripts/dependencies.ts --indirect       # only transitive dependencies
 *   bun scripts/dependencies.ts --prod --peer    # filter by edge type
 *   bun scripts/dependencies.ts --production     # only what ships (excludes dev)
 *   bun scripts/dependencies.ts --why lodash     # every chain that introduced it
 *   bun scripts/dependencies.ts --depth 3        # cap displayed depth
 *   bun scripts/dependencies.ts --paths 5        # show up to N chains per package
 *   bun scripts/dependencies.ts --duplicates     # packages installed at 2+ versions
 *   bun scripts/dependencies.ts --licenses       # group by declared license
 *   bun scripts/dependencies.ts --json out.json  # machine-readable output
 */

import Arborist, { type Edge, type Node } from "@npmcli/arborist";

// #region types

/**
 * Dependency edge kinds. Arborist's published `SaveType` omits `workspace`,
 * but `loadActual()` emits it for monorepo project links, so we widen here
 * rather than casting and silently mislabelling 19 of this repo's 27 root edges.
 */
const EDGE_KINDS = ["prod", "dev", "peer", "peerOptional", "optional", "workspace"] as const;

type EdgeKind = (typeof EDGE_KINDS)[number] | "unknown";

/** Edge kinds that a consumer of a published package actually installs. */
const RUNTIME_KINDS: ReadonlySet<EdgeKind> = new Set<EdgeKind>([
	"prod",
	"peer",
	"peerOptional",
	"optional",
]);

interface DependencyRecord {
	/** Package name as declared in its own `package.json`. */
	name: string;
	/** Resolved version, or `unknown` for unresolvable links. */
	version: string;
	/** Declared by the workspace root or by a workspace package. */
	direct: boolean;
	/** A local `packages/*` or `examples/*` project, not an external dependency. */
	workspace: boolean;
	/**
	 * Part of the project surface — the workspace root or a workspace package.
	 * Distinct from {@link workspace}: the root is a project but not a
	 * workspace, and reporting it as a dependency of itself is meaningless.
	 */
	project: boolean;
	/** Reachable from the project surface without traversing a `dev` edge. */
	production: boolean;
	/** Every edge kind by which this package is depended upon. */
	kinds: Set<EdgeKind>;
	/** Shortest hop count from the project surface. */
	depth: number;
	/** Aggregate keys of the packages that depend on this one. */
	parents: Set<string>;
	/** Declared SPDX license, when the manifest carries one. */
	license: string;
}

interface Options {
	projectPath: string;
	onlyDirect: boolean;
	onlyIndirect: boolean;
	onlyProduction: boolean;
	kinds: Set<EdgeKind>;
	why: string | null;
	maxDepth: number;
	maxPaths: number;
	duplicates: boolean;
	licenses: boolean;
	json: string | null;
	help: boolean;
}

// #endregion

// #region graph traversal

/** Follows symlinks so a workspace package and its `node_modules` link agree. */
function resolveNode(node: Node): Node {
	return node.isLink && node.target ? node.target : node;
}

/** Stable identity for a package: name plus resolved version. */
function keyOf(node: Node): string {
	const name = node.package?.name ?? node.name;
	const version = node.package?.version ?? "unknown";
	return `${name}@${version}`;
}

/** Narrows the runtime edge type without an `any` cast. */
function kindOf(edge: Edge): EdgeKind {
	const raw: string = edge.type;
	return (EDGE_KINDS as readonly string[]).includes(raw) ? (raw as EdgeKind) : "unknown";
}

/** Reads the declared license, tolerating the legacy object form. */
function licenseOf(node: Node): string {
	const license: unknown = node.package?.license;
	if (typeof license === "string") {
		return license;
	}
	if (license && typeof license === "object" && "type" in license) {
		const type: unknown = (license as { type: unknown }).type;
		return typeof type === "string" ? type : "UNKNOWN";
	}
	return "UNKNOWN";
}

/**
 * Breadth-first walk of the dependency graph from the project surface.
 *
 * BFS rather than the obvious recursion: the graph has cycles (peer
 * dependencies routinely close loops), so a recursive all-paths walk both
 * risks the stack and explodes combinatorially. Predecessors are recorded per
 * package instead, and concrete chains are reconstructed on demand and capped
 * — see {@link buildPaths}.
 */
function collect(tree: Node): Map<string, DependencyRecord> {
	const records = new Map<string, DependencyRecord>();

	const projectNodes: Node[] = [tree];
	for (const child of tree.fsChildren ?? []) {
		projectNodes.push(resolveNode(child));
	}

	const projectKeys = new Set(projectNodes.map((node) => keyOf(node)));

	/* Seed the records for the root and each workspace project. */
	for (const node of projectNodes) {
		records.set(keyOf(node), {
			name: node.package?.name ?? node.name,
			version: node.package?.version ?? "unknown",
			direct: false,
			workspace: node !== tree,
			project: true,
			production: true,
			kinds: new Set<EdgeKind>(),
			depth: 0,
			parents: new Set<string>(),
			license: licenseOf(node),
		});
	}

	const queue: Array<{ node: Node; depth: number; production: boolean }> = projectNodes.map(
		(node) => ({ node, depth: 0, production: true }),
	);

	/* Guards against re-expanding a node in a state already covered. */
	const expanded = new Set<string>();

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) {
			break;
		}

		const expansionKey = `${current.node.location}:${current.production ? "prod" : "dev"}`;
		if (expanded.has(expansionKey)) {
			continue;
		}
		expanded.add(expansionKey);

		const fromKey = keyOf(current.node);

		for (const edge of current.node.edgesOut.values()) {
			if (!edge.to) {
				continue;
			}

			const target = resolveNode(edge.to);
			const key = keyOf(target);
			const kind = kindOf(edge);

			/*
			 * A dev edge only installs at the top of a tree, so a dependency
			 * stays production-reachable only while every hop is a runtime or
			 * workspace edge.
			 */
			const production = current.production && (RUNTIME_KINDS.has(kind) || kind === "workspace");

			let record = records.get(key);
			if (!record) {
				record = {
					name: target.package?.name ?? target.name,
					version: target.package?.version ?? "unknown",
					direct: false,
					workspace: target.isWorkspace === true,
					project: target.isWorkspace === true,
					production: false,
					kinds: new Set<EdgeKind>(),
					depth: Number.POSITIVE_INFINITY,
					parents: new Set<string>(),
					license: licenseOf(target),
				};
				records.set(key, record);
			}

			record.kinds.add(kind);
			record.production ||= production;
			record.depth = Math.min(record.depth, current.depth + 1);

			/* Declared by the root or by a workspace package. */
			if (projectKeys.has(fromKey) && kind !== "workspace") {
				record.direct = true;
			}

			if (fromKey !== key) {
				record.parents.add(fromKey);
			}

			queue.push({ node: target, depth: current.depth + 1, production });
		}
	}

	/* Workspace projects are the subject of the report, not dependencies of it. */
	for (const key of projectKeys) {
		records.get(key)?.kinds.delete("workspace");
	}

	return records;
}

// #endregion

// #region path reconstruction

/**
 * Rebuilds up to `limit` introduction chains for a package by walking
 * predecessors back to a project root. Bounded in both breadth and depth, so a
 * cyclic or densely-shared package cannot run away.
 */
function buildPaths(
	key: string,
	records: Map<string, DependencyRecord>,
	limit: number,
): string[][] {
	const paths: string[][] = [];
	const maxHops = 24;

	const walk = (current: string, trail: string[], seen: Set<string>): void => {
		if (paths.length >= limit || trail.length > maxHops) {
			return;
		}

		const record = records.get(current);
		if (!record || record.parents.size === 0) {
			paths.push([current, ...trail]);
			return;
		}

		for (const parent of record.parents) {
			if (paths.length >= limit) {
				return;
			}
			if (seen.has(parent)) {
				continue;
			}
			const nextSeen = new Set(seen);
			nextSeen.add(parent);
			walk(parent, [current, ...trail], nextSeen);
		}
	};

	walk(key, [], new Set([key]));
	return paths;
}

// #endregion

// #region cli

const HELP = `
  bun ws deps [path] [flags]        (or: bun scripts/dependencies.ts)

  Classifies every installed package as direct or transitive by walking the
  dependency graph, not the hoisted node_modules layout. Workspace-aware: a
  dependency declared by a packages/* manifest is direct for that package.

  Scope:
    --direct           Only packages declared by the root or a workspace package
    --indirect         Only transitive packages
    --production       Only what a consumer installs (excludes dev-only)
    --prod --dev       Filter by edge type
    --peer --optional  Filter by edge type (--peer also matches peerOptional)
    --depth <n>        Only packages within <n> hops of the project surface

  Modes:
    --why <pkg>        Every chain that introduced <pkg>, plus remediation targets
    --duplicates       Packages installed at more than one version
    --licenses         Declared licenses, by frequency
    --json [file]      Machine-readable output (default: dependencies.json)

  Output:
    --paths <n>        Show up to <n> introduction chains per package (default 1)

  Examples:
    bun ws deps --direct --production
    bun ws deps --why lodash
    bun ws deps --json audit.json
    bun ws deps ../other-repo --duplicates
`;

function parseArgs(argv: string[]): Options {
	const options: Options = {
		projectPath: process.cwd(),
		onlyDirect: false,
		onlyIndirect: false,
		onlyProduction: false,
		kinds: new Set<EdgeKind>(),
		why: null,
		maxDepth: Number.POSITIVE_INFINITY,
		maxPaths: 1,
		duplicates: false,
		licenses: false,
		json: null,
		help: false,
	};

	let sawPath = false;
	let index = 0;

	function fail(message: string): never {
		console.error(`${message}\n\nRun with --help for usage.`);
		process.exit(1);
	}

	/*
	 * Consumes the next argv entry only when it is a value rather than another
	 * flag. Blindly taking `argv[index + 1]` lets `--depth --direct` swallow
	 * `--direct`, yielding NaN — and because every `depth > NaN` comparison is
	 * false, both filters silently vanish instead of erroring.
	 */
	function takeValue(): string | null {
		const next = argv[index + 1];
		if (next === undefined || next.startsWith("-")) {
			return null;
		}
		index += 1;
		return next;
	}

	/** Reads a numeric option, rejecting missing or malformed values. */
	function takeNumber(flag: string): number {
		const raw = takeValue();
		if (raw === null) {
			return fail(`${flag} needs a number`);
		}
		const value = Number(raw);
		if (!Number.isFinite(value) || value < 0) {
			return fail(`${flag} expects a non-negative number, got "${raw}"`);
		}
		return value;
	}

	for (; index < argv.length; index += 1) {
		const arg = argv[index];
		switch (arg) {
			case "--direct":
				options.onlyDirect = true;
				break;
			case "--indirect":
				options.onlyIndirect = true;
				break;
			case "--production":
				options.onlyProduction = true;
				break;
			case "--prod":
			case "--dev":
			case "--peer":
			case "--optional":
				options.kinds.add(arg.slice(2) as EdgeKind);
				break;
			case "--why":
				options.why = takeValue() ?? fail("--why needs a package name");
				break;
			case "--depth":
				options.maxDepth = takeNumber("--depth");
				break;
			case "--paths":
				options.maxPaths = takeNumber("--paths");
				break;
			case "--help":
			case "-h":
				options.help = true;
				break;
			case "--duplicates":
				options.duplicates = true;
				break;
			case "--licenses":
				options.licenses = true;
				break;
			case "--json":
				options.json = takeValue() ?? "dependencies.json";
				break;
			default:
				/* A typo'd flag must not be mistaken for the project path. */
				if (arg === undefined) {
					break;
				}
				if (arg.startsWith("-")) {
					fail(`Unknown option: ${arg}`);
				}
				if (sawPath) {
					fail(`Unexpected extra argument: ${arg}`);
				}
				options.projectPath = arg;
				sawPath = true;
				break;
		}
	}

	/* `--peer` should also match the optional-peer edges npm emits. */
	if (options.kinds.has("peer")) {
		options.kinds.add("peerOptional");
	}

	return options;
}

function matches(record: DependencyRecord, options: Options): boolean {
	if (record.project) {
		return false;
	}
	if (options.onlyDirect && !record.direct) {
		return false;
	}
	if (options.onlyIndirect && record.direct) {
		return false;
	}
	if (options.onlyProduction && !record.production) {
		return false;
	}
	if (record.depth > options.maxDepth) {
		return false;
	}
	if (options.kinds.size > 0) {
		return [...record.kinds].some((kind) => options.kinds.has(kind));
	}
	return true;
}

function byName(a: DependencyRecord, b: DependencyRecord): number {
	return a.name.localeCompare(b.name) || a.version.localeCompare(b.version);
}

// #endregion

// #region reporting

function printDependency(
	record: DependencyRecord,
	records: Map<string, DependencyRecord>,
	options: Options,
): void {
	const kinds = [...record.kinds].sort().join(", ");
	const flags = record.production ? "" : " (dev-only)";
	console.log(`${record.name}@${record.version} [${kinds}] depth=${record.depth}${flags}`);

	if (record.direct) {
		return;
	}

	for (const path of buildPaths(`${record.name}@${record.version}`, records, options.maxPaths)) {
		console.log(`  ${path.join(" -> ")}`);
	}
}

function printWhy(options: Options, records: Map<string, DependencyRecord>): void {
	const target = options.why;
	const hits = [...records.values()].filter((record) => record.name === target);

	if (hits.length === 0) {
		console.log(`No installed package named "${target}".`);
		process.exitCode = 1;
		return;
	}

	for (const record of hits.sort(byName)) {
		const key = `${record.name}@${record.version}`;
		console.log(`\n${key}`);
		console.log(`  classification: ${record.direct ? "direct" : "indirect"}`);
		console.log(`  depth:          ${record.depth}`);
		console.log(`  edge types:     ${[...record.kinds].sort().join(", ")}`);
		console.log(`  ships to prod:  ${record.production ? "yes" : "no (dev-only)"}`);
		console.log(`  license:        ${record.license}`);
		console.log("\n  Introduced through:");

		const paths = buildPaths(key, records, Math.max(options.maxPaths, 10));
		for (const path of paths) {
			console.log(`    ${path.join(" -> ")}`);
		}

		/*
		 * The first hop on the path that is itself a direct dependency and not
		 * part of the project surface. Naively taking `path[1]` names the
		 * workspace package a dependency arrived through, which nobody can bump
		 * — the actionable target is the external dependency that declares it.
		 */
		const remediation = [
			...new Set(
				paths
					.map((path) =>
						path.find((entry) => {
							const hop = records.get(entry);
							return hop?.direct === true && !hop.project;
						}),
					)
					.filter((entry): entry is string => entry !== undefined),
			),
		];
		if (remediation.length > 0) {
			console.log(`\n  Direct remediation target(s): ${remediation.join(", ")}`);
		}
	}
}

function printDuplicates(records: Map<string, DependencyRecord>): void {
	const versions = new Map<string, string[]>();
	for (const record of records.values()) {
		if (record.project) {
			continue;
		}
		const list = versions.get(record.name) ?? [];
		list.push(record.version);
		versions.set(record.name, list);
	}

	const duplicated = [...versions.entries()]
		.filter(([, list]) => list.length > 1)
		.sort(([a], [b]) => a.localeCompare(b));

	console.log("\nDUPLICATE VERSIONS");
	console.log("==================\n");
	for (const [name, list] of duplicated) {
		console.log(`${name}: ${list.sort().join(", ")}`);
	}
	console.log(`\n${duplicated.length} package(s) installed at more than one version.`);
}

function printLicenses(records: Map<string, DependencyRecord>): void {
	const groups = new Map<string, number>();
	for (const record of records.values()) {
		if (record.project) {
			continue;
		}
		groups.set(record.license, (groups.get(record.license) ?? 0) + 1);
	}

	console.log("\nLICENSES");
	console.log("========\n");
	for (const [license, count] of [...groups.entries()].sort((a, b) => b[1] - a[1])) {
		console.log(`${String(count).padStart(5)}  ${license}`);
	}
}

function toJson(records: Map<string, DependencyRecord>, options: Options): string {
	const payload = [...records.values()]
		.filter((record) => matches(record, options))
		.sort(byName)
		.map((record) => ({
			name: record.name,
			version: record.version,
			classification: record.direct ? "direct" : "indirect",
			kinds: [...record.kinds].sort(),
			depth: record.depth,
			production: record.production,
			license: record.license,
			paths: buildPaths(`${record.name}@${record.version}`, records, options.maxPaths),
		}));

	return JSON.stringify(payload, null, 2);
}

function printReport(records: Map<string, DependencyRecord>, options: Options): void {
	const selected = [...records.values()].filter((record) => matches(record, options));
	const direct = selected.filter((record) => record.direct).sort(byName);
	const indirect = selected.filter((record) => !record.direct).sort(byName);
	const workspaces = [...records.values()].filter((record) => record.workspace);

	if (!options.onlyIndirect) {
		console.log("\nDIRECT DEPENDENCIES");
		console.log("===================\n");
		for (const record of direct) {
			printDependency(record, records, options);
		}
	}

	if (!options.onlyDirect) {
		console.log("\nINDIRECT / TRANSITIVE DEPENDENCIES");
		console.log("==================================\n");
		for (const record of indirect) {
			printDependency(record, records, options);
		}
	}

	console.log("\nSUMMARY");
	console.log("=======");
	console.log(`Workspace packages:   ${workspaces.length}`);
	console.log(`Direct:               ${direct.length}`);
	console.log(`Transitive:           ${indirect.length}`);
	console.log(`Total:                ${direct.length + indirect.length}`);
	console.log(`Production-reachable: ${selected.filter((record) => record.production).length}`);
	console.log(`Dev-only:             ${selected.filter((record) => !record.production).length}`);
}

// #endregion

// #region entrypoint

const options = parseArgs(process.argv.slice(2));

if (options.help) {
	console.log(HELP);
	process.exit(0);
}

const arborist = new Arborist({ path: options.projectPath });
const records = collect(await arborist.loadActual());

if (options.why) {
	printWhy(options, records);
} else if (options.duplicates) {
	printDuplicates(records);
} else if (options.licenses) {
	printLicenses(records);
} else if (options.json) {
	await Bun.write(options.json, toJson(records, options));
	console.log(`Wrote ${options.json}`);
} else {
	printReport(records, options);
}

// #endregion
