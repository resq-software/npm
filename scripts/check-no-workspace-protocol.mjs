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
 * Guard: no `workspace:` protocol in published dependency ranges.
 *
 * The release pipeline publishes via `changeset publish` → `npm publish`, which
 * does NOT understand Bun's `workspace:` protocol and ships it literally. A
 * consumer then runs `bun install` / `npm install` and it fails, because
 * `workspace:*` is unresolvable outside this monorepo.
 *
 * Internal packages must therefore be referenced by a concrete semver range
 * (e.g. `^1.2.3`). Bun still links the local workspace copy for a matching
 * range during development, so this costs nothing locally while keeping the
 * published manifests installable.
 *
 * `devDependencies` are intentionally NOT checked: they are stripped from the
 * consumer's install graph, so a `workspace:` there cannot break downstream.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES_DIR = join(REPO_ROOT, "packages");
const PUBLISHED_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];

const violations = [];

for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const manifestPath = join(PACKAGES_DIR, entry.name, "package.json");
	if (!existsSync(manifestPath)) continue;

	const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
	if (pkg.private) continue;

	for (const field of PUBLISHED_FIELDS) {
		for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
			if (String(range).startsWith("workspace:")) {
				violations.push(`packages/${entry.name}/package.json → ${field}.${dep} = "${range}"`);
			}
		}
	}
}

if (violations.length > 0) {
	console.error("✖ Unresolvable `workspace:` protocol in published dependency ranges:\n");
	for (const v of violations) console.error(`  ${v}`);
	console.error(
		"\n`npm publish` ships these literally and breaks downstream installs." +
			"\nReplace each with a concrete semver range (e.g. `^1.2.3`).",
	);
	process.exit(1);
}

console.log("✓ No `workspace:` protocol in published dependency ranges.");
