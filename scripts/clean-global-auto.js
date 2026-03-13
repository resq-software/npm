#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

try {
	// Get global pnpm directory
	const globalNodeModules = execSync("pnpm root -g", {
		encoding: "utf-8",
	}).trim();
	const globalDir = path.dirname(globalNodeModules);
	const pkgPath = path.join(globalDir, "package.json");

	// Read and parse package.json
	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

	// Remove all @auto-engineer dependencies
	const deps = pkg.dependencies || {};
	const toRemove = Object.keys(deps).filter((k) => k.includes("auto-engineer"));

	if (toRemove.length === 0) {
		process.exit(0);
	}
	toRemove.forEach((k) => delete deps[k]);

	// Write updated package.json
	fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
	execSync("pnpm install", {
		cwd: globalDir,
		stdio: "inherit",
	});
} catch (_error) {
	process.exit(1);
}
