/**
 *
 * Copyright 2026 ResQ Systems, Inc.
 * SPDX-License-Identifier: Apache-2.0
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

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		coverage: {
			all: true,
			// `include: ["src"]` counted 80 *.stories.tsx, globals.css and a .snap as
			// production source - 82 of 257 files, all at or near zero - and reported 76.90%
			// lines where the real figure is 80.82%. Codecov baselines on the first report it
			// receives, so the honest scope has to arrive with --coverage, not after it.
			exclude: ["src/**/*.stories.tsx"],
			include: ["src/**/*.{ts,tsx}"],
			reporter: ["html", "lcov", "text"],
		},
		environment: "jsdom",
		exclude: [".worktrees", "lib", "node_modules"],
		setupFiles: ["console-fail-test/setup"],
	},
});
