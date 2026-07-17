/**
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
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { colors, fonts, radii } from "../src/tokens";

// The shipped CSS mirror. These assertions fail if any value drifts from
// `src/tokens.ts`, keeping the `oklch` source of truth and its CSS form in sync.
const rawCss = readFileSync(fileURLToPath(new URL("../src/tokens.css", import.meta.url)), "utf8");

// Compare semantically, not byte-for-byte: the CSS formatter (Biome) strips
// insignificant trailing zeros (`268.80` → `268.8`), unifies quote style, and
// may wrap long declarations. Normalizing both sides tolerates that while still
// catching a genuine value change.
const canon = (s: string): string =>
	s
		.replace(/['"]/g, '"')
		.replace(/(\d+)\.0+(?!\d)/g, "$1") // 64.00% -> 64%, 1.00 -> 1
		.replace(/(\d*\.[1-9]+)0+(?!\d)/g, "$1") // 268.80 -> 268.8, 0.1560 -> 0.156
		.replace(/\s+/g, " ");

const css = canon(rawCss);

describe("tokens.css", () => {
	it("scopes the custom properties to :root", () => {
		expect(rawCss).toContain(":root {");
	});

	it("mirrors every oklch color role from tokens.ts", () => {
		for (const [role, value] of Object.entries(colors.oklch)) {
			expect(css).toContain(canon(`--resq-color-${role}: ${value};`));
		}
	});

	it("mirrors the categorical chart palette in order", () => {
		colors.chart.forEach((value, index) => {
			expect(css).toContain(canon(`--resq-chart-${index + 1}: ${value};`));
		});
	});

	it("mirrors the radius scale", () => {
		for (const [key, value] of Object.entries(radii)) {
			expect(css).toContain(canon(`--resq-radius-${key}: ${value};`));
		}
	});

	it("mirrors the font stacks", () => {
		expect(css).toContain(canon(`--resq-font-display: ${fonts.stacks.display.join(", ")};`));
		expect(css).toContain(canon(`--resq-font-body: ${fonts.stacks.body.join(", ")};`));
		expect(css).toContain(canon(`--resq-font-mono: ${fonts.stacks.mono.join(", ")};`));
	});
});
