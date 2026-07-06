/**
 * Copyright 2026 ResQ
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
import { join } from "node:path";
import { colors } from "@resq-sw/constants/tokens";
import { describe, expect, it } from "vitest";

/**
 * Drift guard: the shared `@resq-sw/constants` oklch tokens are the canonical
 * brand values. This asserts `globals.css` carries the same values so the UI
 * CSS and the constants package (which email + other apps consume) can never
 * silently diverge. `@resq-sw/constants` is the single source; update it, then
 * update `globals.css` to match.
 */
const css = readFileSync(join(process.cwd(), "src", "styles", "globals.css"), "utf8");

/** Parse `oklch(L% C H)` into a numeric [L, C, H] tuple (ignores formatting). */
function parseOklch(value: string): [number, number, number] {
	const match = value.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/i);
	if (!match) throw new Error(`Not an oklch value: ${value}`);
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Read a `--<name>: oklch(...)` custom property from globals.css. */
function cssVar(name: string): [number, number, number] {
	const match = css.match(new RegExp(`--${name}:\\s*(oklch\\([^)]+\\))`));
	if (!match) throw new Error(`--${name} not found in globals.css`);
	return parseOklch(match[1]);
}

/** constants token → the globals.css custom property that must carry the same value. */
const mapping: Record<keyof typeof colors.oklch, string> = {
	background: "background",
	foreground: "foreground",
	surface: "card", // the email "surface" token maps to the UI card surface
	border: "border",
	muted: "muted-foreground",
	primary: "primary",
};

describe("globals.css brand tokens stay in sync with @resq-sw/constants", () => {
	for (const [token, cssName] of Object.entries(mapping) as [keyof typeof colors.oklch, string][]) {
		it(`--${cssName} matches constants.oklch.${token}`, () => {
			expect(cssVar(cssName)).toEqual(parseOklch(colors.oklch[token]));
		});
	}
});
