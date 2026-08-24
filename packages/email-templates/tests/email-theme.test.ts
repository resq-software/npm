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

import { describe, expect, it } from "vitest";
import { emailDesignContract } from "../src/email-design-contract";
import {
	buildDarkModeCss,
	defaultEmailTheme,
	mergeEmailTheme,
	pickShellRoles,
} from "../src/emails/theme";

describe("adaptive email theme", () => {
	it("uses the contract light roles while preserving semantic colors", () => {
		expect(pickShellRoles(defaultEmailTheme.colors)).toEqual(emailDesignContract.modes.light);
		expect(defaultEmailTheme.colors).toMatchObject({
			info: "#7D8CAE",
			success: "#3FB984",
			warning: "#E0A100",
			danger: "#D43E3F",
		});
	});

	it("uses the contract dark roles and approved descriptor", () => {
		expect(defaultEmailTheme.darkColors).toEqual(emailDesignContract.modes.dark);
		expect(defaultEmailTheme.org.descriptor).toBe("Autonomous Disaster Response");
	});

	it("shallow-merges light and dark modes independently without mutating the base", () => {
		const baseLight = { ...defaultEmailTheme.colors };
		const baseDark = { ...defaultEmailTheme.darkColors };

		const result = mergeEmailTheme({
			colors: { foreground: "#101010" },
			darkColors: { muted: "#ABCDEF" },
		});

		expect(result.colors).toEqual({ ...baseLight, foreground: "#101010" });
		expect(result.darkColors).toEqual({ ...baseDark, muted: "#ABCDEF" });
		expect(result.colors).not.toBe(defaultEmailTheme.colors);
		expect(result.darkColors).not.toBe(defaultEmailTheme.darkColors);
		expect(defaultEmailTheme.colors).toEqual(baseLight);
		expect(defaultEmailTheme.darkColors).toEqual(baseDark);
	});

	it("builds a stable, pure dark-mode stylesheet from shell roles", () => {
		const before = structuredClone(defaultEmailTheme);
		const css = buildDarkModeCss(defaultEmailTheme);

		expect(css).toBe(`@media (prefers-color-scheme: dark) {
  .resq-email-body { background-color: #0A0E1A !important; }
  .resq-email-card { background-color: #171C2B !important; border-color: #1E2438 !important; }
  .resq-email-foreground { color: #F0F2FA !important; }
  .resq-email-muted { color: #7D8CAE !important; }
  .resq-email-neutral-divider { border-color: #1E2438 !important; }
  .resq-email-brand-rule { background-color: #D43E3F !important; }
}`);
		expect(css).toContain("@media (prefers-color-scheme: dark)");
		expect(css).toContain("#0A0E1A");
		expect(css).not.toContain("undefined");
		expect(defaultEmailTheme).toEqual(before);
	});

	it.each([
		"red",
		"#123",
		"#12345678",
		"#123456; color: red",
		"#123456\n.resq-email-card { color: red; }",
	])("rejects unsafe dark-mode CSS color %j", (color) => {
		const theme = mergeEmailTheme({ darkColors: { background: color } });

		expect(() => buildDarkModeCss(theme)).toThrow("invalid dark-mode color for background");
	});

	it("rejects a stateful coercion object without invoking it", () => {
		let coercions = 0;
		const color = {
			toString() {
				coercions += 1;
				return coercions === 1 ? "#123456" : "#123456; color: red";
			},
		};
		const theme = mergeEmailTheme({
			darkColors: { background: color as unknown as string },
		});

		expect(() => buildDarkModeCss(theme)).toThrow("invalid dark-mode color for background");
		expect(coercions).toBe(0);
	});
});
