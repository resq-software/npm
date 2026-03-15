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

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { prepareGithubPackage } from "./prepare-github-package.mjs";

test("stages a GitHub Packages manifest from an npm tarball", () => {
	const tempDir = mkdtempSync(join(tmpdir(), "resq-ui-gh-package-"));

	try {
		const packageDir = join(tempDir, "staged", "package");

		mkdirSync(packageDir, { recursive: true });
		writeFileSync(
			join(packageDir, "package.json"),
			`${JSON.stringify(
				{
					name: "@resq-sw/ui",
					version: "1.2.3",
					repository: {
						type: "git",
						url: "git+https://github.com/resq-software/ui.git",
					},
					main: "lib/index.js",
					publishConfig: {
						access: "public",
						provenance: true,
						registry: "https://registry.npmjs.org/",
					},
				},
				null,
				2,
			)}\n`,
		);

		const stagedPackageDir = prepareGithubPackage(packageDir);

		const packageJson = JSON.parse(
			readFileSync(join(packageDir, "package.json"), "utf8"),
		);

		assert.equal(packageJson.name, "@resq-software/ui");
		assert.equal(packageJson.version, "1.2.3");
		assert.deepEqual(packageJson.repository, {
			type: "git",
			url: "git+https://github.com/resq-software/ui.git",
		});
		assert.equal(packageJson.main, "lib/index.js");
		assert.deepEqual(packageJson.publishConfig, {
			registry: "https://npm.pkg.github.com",
		});
		assert.equal(stagedPackageDir, packageDir);
	} finally {
		rmSync(tempDir, { force: true, recursive: true });
	}
});
