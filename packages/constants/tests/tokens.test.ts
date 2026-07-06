/**
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
 */

import { describe, expect, it } from "vitest";
import { colors, fonts, radii, themeColor } from "../src/tokens";

describe("colors", () => {
	it("exposes a valid #RRGGBB hex for every token", () => {
		for (const value of Object.values(colors.hex)) {
			expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it("has an oklch source for every core token", () => {
		for (const value of Object.values(colors.oklch)) {
			expect(value).toMatch(/^oklch\(/);
		}
	});
});

describe("fonts", () => {
	it("provides non-empty stacks for display, body, and mono", () => {
		expect(fonts.stacks.display.length).toBeGreaterThan(0);
		expect(fonts.stacks.body.length).toBeGreaterThan(0);
		expect(fonts.stacks.mono.length).toBeGreaterThan(0);
	});
});

describe("radii", () => {
	it("uses px units (email-safe)", () => {
		for (const value of Object.values(radii)) {
			expect(value).toMatch(/^(\d+px|999px)$/);
		}
	});
});

describe("themeColor", () => {
	it("provides light and dark theme-color hex values", () => {
		expect(themeColor.light).toMatch(/^#[0-9a-fA-F]{6}$/);
		expect(themeColor.dark).toBe(colors.hex.background);
	});
});
