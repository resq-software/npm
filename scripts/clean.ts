#!/usr/bin/env tsx
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

// @ts-check
import { execSync } from "node:child_process";

const commands = [
	"rm -rf node_modules",
	"rm -rf dist",
	"rm -rf .pnpm-store",
	'find . -type d -name "node_modules" -exec rm -rf {} +',
	'find . -type d -name "dist" -exec rm -rf {} +',
	'find . -type d -name ".turbo" -exec rm -rf {} +',
	'find . -type d -name "coverage" -exec rm -rf {} +',
	'find . -type d -name ".next" -exec rm -rf {} +',
	'find . -type d -name "build" -exec rm -rf {} +',
	'find . -name "*.tsbuildinfo" -delete',
	'find . -type d -name ".cache" -exec rm -rf {} +',
];

commands.forEach((cmd) => {
	try {
		execSync(cmd, { stdio: "inherit" });
	} catch (_err) {
		process.exit(1);
	}
});
