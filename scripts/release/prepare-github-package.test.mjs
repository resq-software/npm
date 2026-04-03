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
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { prepareGithubPackage } from "./prepare-github-package.mjs";

describe("prepareGithubPackage", () => {
	it("maps @resq-sw/ui → @resq-software/ui", () => {
		const tempDir = mkdtempSync(join(tmpdir(), "resq-gh-pkg-"));

		try {
			const packageDir = join(tempDir, "staged", "package");
			mkdirSync(packageDir, { recursive: true });
			writeFileSync(
				join(packageDir, "package.json"),
				JSON.stringify({
					name: "@resq-sw/ui",
					version: "1.2.3",
					main: "lib/index.js",
					publishConfig: { access: "public", provenance: true, registry: "https://registry.npmjs.org/" },
					scripts: { prepare: "husky" },
				}),
			);

			const result = prepareGithubPackage(packageDir);
			const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

			assert.equal(pkg.name, "@resq-software/ui");
			assert.equal(pkg.version, "1.2.3");
			assert.equal(pkg.publishConfig.registry, "https://npm.pkg.github.com");
			assert.equal(pkg.scripts?.prepare, undefined);
			assert.equal(result, packageDir);
		} finally {
			rmSync(tempDir, { force: true, recursive: true });
		}
	});

	it("maps @resq-sw/dsa → @resq-software/dsa", () => {
		const tempDir = mkdtempSync(join(tmpdir(), "resq-gh-pkg-"));

		try {
			const packageDir = join(tempDir, "staged", "package");
			mkdirSync(packageDir, { recursive: true });
			writeFileSync(
				join(packageDir, "package.json"),
				JSON.stringify({
					name: "@resq-sw/dsa",
					version: "0.1.0",
					main: "lib/index.js",
					publishConfig: { access: "public", registry: "https://registry.npmjs.org/" },
				}),
			);

			const result = prepareGithubPackage(packageDir);
			const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

			assert.equal(pkg.name, "@resq-software/dsa");
			assert.equal(pkg.publishConfig.registry, "https://npm.pkg.github.com");
			assert.equal(result, packageDir);
		} finally {
			rmSync(tempDir, { force: true, recursive: true });
		}
	});

	it("maps any @resq-sw/<name> automatically", () => {
		const tempDir = mkdtempSync(join(tmpdir(), "resq-gh-pkg-"));

		try {
			const packageDir = join(tempDir, "staged", "package");
			mkdirSync(packageDir, { recursive: true });
			writeFileSync(
				join(packageDir, "package.json"),
				JSON.stringify({ name: "@resq-sw/future-pkg", version: "0.0.1" }),
			);

			prepareGithubPackage(packageDir);
			const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

			assert.equal(pkg.name, "@resq-software/future-pkg");
		} finally {
			rmSync(tempDir, { force: true, recursive: true });
		}
	});

	it("throws for non @resq-sw/* packages", () => {
		const tempDir = mkdtempSync(join(tmpdir(), "resq-gh-pkg-"));

		try {
			const packageDir = join(tempDir, "staged", "package");
			mkdirSync(packageDir, { recursive: true });
			writeFileSync(
				join(packageDir, "package.json"),
				JSON.stringify({ name: "some-other-pkg", version: "1.0.0" }),
			);

			assert.throws(() => prepareGithubPackage(packageDir), /does not match @resq-sw\/\*/);
		} finally {
			rmSync(tempDir, { force: true, recursive: true });
		}
	});
});
