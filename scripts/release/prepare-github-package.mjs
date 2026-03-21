#!/usr/bin/env node
/**
 *
 * Copyright 2026 ResQ Software
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

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function prepareGithubPackage(packageDirArg) {
	const packageDir = resolve(packageDirArg);
	const packageJsonPath = join(packageDir, "package.json");

	let raw;
	try {
		raw = readFileSync(packageJsonPath, "utf8");
	} catch {
		throw new Error(`Staged package manifest not found: ${packageJsonPath}`);
	}

	const packageJson = JSON.parse(raw);

	packageJson.name = "@resq-software/ui";
	packageJson.publishConfig = {
		...(packageJson.publishConfig ?? {}),
		registry: "https://npm.pkg.github.com",
	};
	if (packageJson.scripts) {
		delete packageJson.scripts.prepare;
	}

	writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, "\t")}\n`);

	return packageDir;
}

function isCliEntryPoint() {
	return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isCliEntryPoint()) {
	const [, , packageDirArg] = process.argv;

	if (!packageDirArg) {
		console.error("Usage: node scripts/release/prepare-github-package.mjs <package-dir>");
		process.exit(1);
	}

	try {
		process.stdout.write(`${prepareGithubPackage(packageDirArg)}\n`);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
