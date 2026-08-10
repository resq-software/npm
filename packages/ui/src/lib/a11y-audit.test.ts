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
 * Writes findings to a JSON report rather than asserting, so the whole picture
 * can be read at once.
 */

import { writeFileSync } from "node:fs";

import axe from "axe-core";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

/**
 * Without this React logs an error on every `act()`, and `console-fail-test`
 * turns those into a suite failure. It is a global, so it is set here rather
 * than in the shared setup, which other suites do not need.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const REPORT_PATH =
	"/tmp/claude-1000/-home-wombocombo-github-wrk-npm/2953833a-408a-4f0b-b10d-8c6bec93b890/scratchpad/a11y-report-verify.json";

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
			if (typeof story.render !== "function" && typeof component !== "function") continue;

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

		writeFileSync(
			REPORT_PATH,
			JSON.stringify({ audited, findings, renderErrors, skipped, total: cases.length }, null, 2),
		);

		expect(cases.length).toBeGreaterThan(0);
	}, 900_000);
});
