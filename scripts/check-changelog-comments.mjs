#!/usr/bin/env node
/**
 *
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
 *
 */

/**
 * Guard: no release notes trapped inside an HTML comment.
 *
 * Every `packages/<name>/CHANGELOG.md` once rendered blank on npm and GitHub,
 * with 69 sections invisible across all 15 packages, because of a loop between
 * two tools that each behaved reasonably on their own:
 *
 *   1. the file began with the licence `<!--`;
 *   2. `changeset version` inserts its new entry immediately after the first
 *      line, which put the release notes *inside* that comment;
 *   3. the licence header was then no longer recognisable at the top, so the
 *      next `resq copyright` run prepended a second one — and the cycle
 *      repeated, one nested block per release.
 *
 * The layout fix is that a changelog now starts with `# Changelog`, so step 2
 * inserts after the title rather than after a comment opener, and `resq
 * copyright` still finds the existing header further down and skips it.
 *
 * This guard exists because that fix is a property of file *order*, which is
 * invisible in review and easy to undo by accident. A changelog is what a
 * consumer reads on npm to decide whether an upgrade is safe; when this breaks
 * it breaks silently, and the page merely looks empty.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const PACKAGES_DIR = "packages";
const COMMENT = /<!--([\s\S]*?)-->/g;
const VERSION_HEADING = /^## .*$/gm;
const LICENCE_LINE = /Copyright\s+\d{4}\s+ResQ/g;

/** Every changelog in the workspace, as `[package, path, contents]`. */
function changelogs() {
	const found = [];
	for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const path = join(PACKAGES_DIR, entry.name, "CHANGELOG.md");
		try {
			found.push([entry.name, path, readFileSync(path, "utf8")]);
		} catch {
			// A package without a changelog has simply never been released.
		}
	}
	return found;
}

const all = changelogs();
const problems = [];

for (const [name, path, contents] of all) {
	const hidden = [...contents.matchAll(COMMENT)].flatMap((match) => [
		...match[1].matchAll(VERSION_HEADING),
	]);
	if (hidden.length > 0) {
		problems.push(
			`${path}: ${hidden.length} release section(s) inside an HTML comment — ` +
				`invisible on npm and GitHub. First: ${hidden[0][0].trim()}`,
		);
	}

	const licences = [...contents.matchAll(LICENCE_LINE)].length;
	if (licences > 1) {
		problems.push(
			`${path}: ${licences} licence headers — the header is being prepended again ` +
				"each release instead of being recognised.",
		);
	}

	const firstLine = contents.split("\n", 1)[0] ?? "";
	if (!firstLine.startsWith("# ")) {
		problems.push(
			`${path} (${name}): starts with ${JSON.stringify(firstLine.slice(0, 40))} rather ` +
				"than a `# ` heading. `changeset version` inserts after the first line, so " +
				"anything else there swallows the next release notes.",
		);
	}
}

if (problems.length > 0) {
	console.error("Changelog guard failed:\n");
	for (const problem of problems) console.error(`  - ${problem}`);
	console.error(
		"\nA changelog must begin with `# Changelog`, carry exactly one licence header " +
			"below it, and keep every release section outside HTML comments.\n" +
			"See https://github.com/resq-software/npm/issues/248 for how this breaks.",
	);
	process.exit(1);
}

console.log(`Changelog guard: ${all.length} changelogs clean.`);
