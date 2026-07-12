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

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
		globals: false,
		// Type-level assertions (assertType / @ts-expect-error) live in
		// tests/**/*.test-d.ts and are checked by the typechecker, not the runtime.
		// `enabled: true` makes `vitest run` (the `test` script) run tsc over the
		// *.test-d.ts files as part of the suite.
		typecheck: {
			enabled: true,
			include: ["tests/**/*.test-d.ts"],
			tsconfig: "./tsconfig.test.json",
		},
	},
});
