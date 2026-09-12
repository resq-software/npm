// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Accessibility audit across every story in the package.
 *
 * `@storybook/addon-a11y` runs axe-core in the Storybook panel one story at a
 * time, by hand. This runs the same engine over every story at once, so
 * coverage stops depending on someone remembering to click through 450 of them.
 *
 * Colour-contrast rules are disabled here: jsdom has no layout and the Tailwind
 * cascade is not loaded, so axe cannot resolve a computed colour and would
 * report noise. Contrast is covered analytically by `contrast-audit.test.ts`
 * against the oklch tokens.
 *
 * Writes the full picture to a JSON report AND asserts zero, so a regression
 * fails rather than quietly changing a number nobody reads.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import axe from "axe-core";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

/**
 * Without this React logs an error on every `act()`, and `console-fail-test`
 * turns those into a suite failure. It is a global, so it is set here rather
 * than in the shared setup, which other suites do not need.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Where the report lands.
 *
 * Repo-relative, not the OS temp directory. A fixed name under `/tmp` is a
 * symlink-attack surface — anyone on the box can pre-create the path and choose
 * what the run overwrites — and it is also unreproducible: the first version of
 * this file hard-coded one machine's scratchpad, so on any other machine the
 * write threw `ENOENT` *after* the full ten-minute audit had run, losing all of
 * it at the last step.
 *
 * `A11Y_REPORT_PATH` overrides it for CI, which may want the artefact elsewhere.
 */
const REPORT_PATH = process.env.A11Y_REPORT_PATH ?? resolve(process.cwd(), "a11y-report.json");

/** Rules that cannot produce a trustworthy result without layout or CSS. */
const DISABLED_RULES = {
	"color-contrast": { enabled: false },
	"color-contrast-enhanced": { enabled: false },
};

interface StoryCase {
	component: string;
	story: string;
	element: unknown;
}

interface Finding {
	component: string;
	story: string;
	rule: string;
	impact: string;
	help: string;
	target: string;
	html: string;
}

/**
 * jsdom ships neither of these, and without them Sidebar, Sonner, Command and
 * Slider threw before axe ever saw them — twenty stories silently unaudited,
 * which is worse than a failing check because it looks like a pass.
 */
function polyfillJsdom(): void {
	if (typeof globalThis.matchMedia !== "function") {
		Object.defineProperty(globalThis, "matchMedia", {
			configurable: true,
			value: (query: string) => ({
				addEventListener: () => undefined,
				addListener: () => undefined,
				dispatchEvent: () => false,
				matches: false,
				media: query,
				onchange: null,
				removeEventListener: () => undefined,
				removeListener: () => undefined,
			}),
			writable: true,
		});
	}

	if (typeof globalThis.ResizeObserver !== "function") {
		Object.defineProperty(globalThis, "ResizeObserver", {
			configurable: true,
			value: class {
				disconnect() {}
				observe() {}
				unobserve() {}
			},
			writable: true,
		});
	}
}

const modules = import.meta.glob("../components/*/*.stories.tsx", { eager: true }) as Record<
	string,
	Record<string, unknown>
>;

/** Build a renderable element for every exported story. */
function collectCases(): { cases: StoryCase[]; skipped: string[] } {
	const cases: StoryCase[] = [];
	const skipped: string[] = [];

	for (const [file, mod] of Object.entries(modules)) {
		const meta = mod.default as
			| { component?: unknown; args?: Record<string, unknown>; title?: string }
			| undefined;
		const component = meta?.component;
		const title = meta?.title ?? file;

		for (const [name, value] of Object.entries(mod)) {
			if (name === "default" || value === null || typeof value !== "object") continue;
			const story = value as {
				args?: Record<string, unknown>;
				render?: (args: Record<string, unknown>) => unknown;
			};
			// A story may legitimately be `export const Default: Story = {}` — no args
			// and no render. Skipping those silently excluded the plainest variant of
			// many components, which is exactly the one most likely to be unlabelled.
			if (typeof story.render !== "function" && typeof component !== "function") {
				// Record it. This array was declared and returned but never written to,
				// so the report claimed `"skipped": []` while quietly dropping stories —
				// the exact silent-exclusion failure the comment above warns about, and
				// the third time in this file that a check reported clean by measuring
				// less than it appeared to.
				skipped.push(`${title} / ${name}`);
				continue;
			}

			const args = { ...(meta?.args ?? {}), ...(story.args ?? {}) };

			if (typeof story.render === "function") {
				cases.push({ component: title, element: story.render(args), story: name });
				continue;
			}
			cases.push({
				component: title,
				element: createElement(component as never, args as never),
				story: name,
			});
		}
	}

	return { cases, skipped };
}

/**
 * Opt-in: rendering every story through axe takes about ten minutes, and the
 * package suite runs in sixteen seconds. Making everyone pay that on every
 * `bun test` is how a check gets deleted. Run it with `bun run a11y`.
 */
describe.runIf(process.env.A11Y_AUDIT === "1")("Accessibility audit", () => {
	it("runs axe over every story and writes a report", async () => {
		polyfillJsdom();

		// Rendering 374 stories makes React and recharts talk: act() warnings from
		// async state, layout complaints from a chart in a DOM with no layout. That
		// noise trips `console-fail-test` and would red the gate for reasons that
		// have nothing to do with accessibility. Capture it into the report instead
		// of muting it — a "unique key" warning in there is a real defect, and
		// silently swallowing it would trade one blind spot for another.
		const noise: string[] = [];
		const record = (...args: unknown[]) => {
			noise.push(args.map((a) => String(a)).join(" ").slice(0, 200));
		};
		const errorSpy = vi.spyOn(console, "error").mockImplementation(record);
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(record);
		const { cases, skipped } = collectCases();
		const audited: string[] = [];
		const findings: Finding[] = [];
		const renderErrors: { component: string; story: string; message: string }[] = [];

		for (const testCase of cases) {
			const host = document.createElement("div");
			document.body.appendChild(host);

			try {
				const root = createRoot(host);
				await act(async () => {
					root.render(testCase.element as never);
				});

				const results = await axe.run(host, { rules: DISABLED_RULES });
				for (const violation of results.violations) {
					for (const node of violation.nodes) {
						findings.push({
							component: testCase.component,
							help: violation.help,
							html: node.html.slice(0, 160),
							impact: violation.impact ?? "unknown",
							rule: violation.id,
							story: testCase.story,
							target: String(node.target[0] ?? ""),
						});
					}
				}

				audited.push(`${testCase.component} / ${testCase.story}`);
				await act(async () => {
					root.unmount();
				});
			} catch (error) {
				renderErrors.push({
					component: testCase.component,
					message: error instanceof Error ? error.message.slice(0, 200) : String(error),
					story: testCase.story,
				});
			} finally {
				host.remove();
			}
		}

		errorSpy.mockRestore();
		warnSpy.mockRestore();

		writeFileSync(
			REPORT_PATH,
			JSON.stringify(
				{ audited, findings, noise: [...new Set(noise)], renderErrors, skipped, total: cases.length },
				null,
				2,
			),
		);

		// Coverage first: a harness that silently stops collecting stories reports
		// zero violations and looks like success. Two earlier versions of this file
		// did exactly that — one skipped every no-args story, one let twenty stories
		// throw before axe saw them — and between them hid 11 of 38 real findings.
		expect(cases.length).toBeGreaterThan(300);
		expect(audited.length).toBeGreaterThan(360);

		// Then the gate itself.
		const summary = findings
			.map((f) => `${f.component} / ${f.story}: ${f.rule} — ${f.help}`)
			.join("\n");
		expect(summary, `axe found ${findings.length} violations:\n${summary}`).toBe("");
	}, 900_000);
});
