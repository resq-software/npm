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

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { prepareGithubPackage } from "./prepare-github-package.mjs";

describe("prepareGithubPackage", () => {
	it("stages a GitHub Packages manifest from an npm tarball", () => {
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
						scripts: {
							prepare: "husky",
						},
					},
					null,
					2,
				)}\n`,
			);

			const stagedPackageDir = prepareGithubPackage(packageDir);

			const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

			expect(packageJson.name).toBe("@resq-software/ui");
			expect(packageJson.version).toBe("1.2.3");
			expect(packageJson.repository).toEqual({
				type: "git",
				url: "git+https://github.com/resq-software/ui.git",
			});
			expect(packageJson.main).toBe("lib/index.js");
			expect(packageJson.publishConfig).toEqual({
				access: "public",
				provenance: true,
				registry: "https://npm.pkg.github.com",
			});
			expect(packageJson.scripts?.prepare).toBeUndefined();
			expect(stagedPackageDir).toBe(packageDir);
		} finally {
			rmSync(tempDir, { force: true, recursive: true });
		}
	});
});
