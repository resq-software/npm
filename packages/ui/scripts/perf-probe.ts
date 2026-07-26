// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Dev tool — reproduces a Storybook control *drag* and reports what
 * it costs, using the same numbers the ⚡ Performance panel shows.
 *
 * Unlike a synthetic channel emit, this drives the **real** `type: "range"`
 * controls in the full Storybook manager: it ramps every slider min→max→min at
 * requestAnimationFrame cadence for a sustained window (a held drag with values
 * continuously updating), setting the value through the native setter and firing
 * `input`/`change` so React's onChange → `updateArgs` → preview re-render fires
 * exactly as under a mouse. Because it runs the whole manager, the drag includes
 * the a11y addon, StrictMode double-renders and the channel round-trip — i.e. the
 * felt experience, not an isolated component.
 *
 * It captures the addon's own metrics off the manager channel while the drag
 * runs, so the readout lines up with the panel:
 *   - `metrics-update` (flat browser metrics) → worst fps, dropped frames, worst
 *     frame, style writes, long tasks, react p95 — counters reported as deltas
 *     over the drag window.
 *   - `profiler-update` (`{id, metrics, storyId}`) → `memoizationEfficiency`,
 *     surfaced as "work saved".
 *
 * Reading the ⚡ Performance panel (verified against the addon source):
 *   - Only the *React Performance* section is scoped to the story and uses a
 *     real browser API (the Profiler). "Frame Timing", "Style Writes" and
 *     "Thrashing" are whole-`document.body` *heuristic* counters, so they also
 *     count the a11y addon's axe scans, StrictMode double-renders and Storybook
 *     chrome — not just your component. That is why this script labels them as
 *     whole-preview and treats react p95 as the only component-scoped number.
 *   - "Dropped Frames" = any frame slower than 33.3ms (a hardcoded 16.67 × 2,
 *     i.e. the 60fps budget — NOT the display's refresh, so a 120/160Hz monitor
 *     does not raise the bar).
 *   - "Style Writes" counts inline `style`-attribute mutations only. SVG motion
 *     via `transform` / `d` / `fill` *attributes* is not observed, and these
 *     instruments write zero inline styles — so they contribute 0 there.
 *   - `memoizationEfficiency` = actualDuration / baseDuration, where LOWER is
 *     better (<1 = memoisation skipped work; >1 = possible wasted re-render).
 *     The panel's "Work Saved" — and this script's `saved%` column — is 1 − that.
 *
 * Usage:
 *   bun packages/ui/scripts/perf-probe.ts                 # default instrument set
 *   bun packages/ui/scripts/perf-probe.ts <story-id> ...  # any stories (sliders auto-found)
 *   SB_URL=http://localhost:6006 CHROME_PATH=/usr/bin/google-chrome-stable \
 *     DRAG_MS=3000 bun packages/ui/scripts/perf-probe.ts
 *
 * @module @resq-systems/ui/scripts/perf-probe
 */

import puppeteer from "puppeteer-core";

const ADDON = "primer-performance-monitor";
const BASE = process.env["SB_URL"] ?? "http://localhost:6006";
const CHROME = process.env["CHROME_PATH"] ?? "/usr/bin/google-chrome-stable";
/** How long to hold the drag, in ms. */
const DRAG_MS = Number(process.env["DRAG_MS"]) || 2500;
/** One full min→max→min sweep every this-many ms (a natural drag speed). */
const PERIOD_MS = 1200;

const DEFAULT_STORIES = [
	"instruments-heading-indicator--north",
	"instruments-altimeter--cruise",
	"instruments-attitude-indicator--right-bank",
	"instruments-airspeed-indicator--cruise",
	"instruments-vertical-speed-indicator--climb",
	"instruments-turn-coordinator--coordinated-right-turn",
];

interface Chan {
	on(event: string, handler: (data: unknown) => void): void;
}

interface ManagerWindow extends Window {
	__STORYBOOK_ADDONS_CHANNEL__?: Chan;
	__perfMetrics?: Array<Record<string, unknown>>;
	__perfReact?: Array<Record<string, unknown>>;
}

interface DragResult {
	sliders: number;
	updates: number;
}

interface Summary {
	samples: number;
	minFps: number;
	drops: number;
	maxFrame: number;
	styleWrites: number;
	longTasks: number;
	reactP95: number;
	savedPct: number;
}

/**
 * Runs in the MANAGER page: ensure the Controls panel is mounted so its range
 * inputs are in the DOM (they render lazily behind the Controls tab).
 */
function ensureControls(): number {
	const count = () => document.querySelectorAll('input[type="range"]').length;
	if (count() > 0) return count();
	const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
	const controlsTab = tabs.find((tab) => /controls/i.test(tab.textContent ?? ""));
	(controlsTab as HTMLElement | undefined)?.click();
	return count();
}

/**
 * Runs in the MANAGER page: subscribe to the addon's channel events. The panel
 * feeds off exactly these, so capturing them here mirrors what a human sees.
 */
function beginCapture(addon: string): void {
	const w = window as unknown as ManagerWindow;
	const metrics: Array<Record<string, unknown>> = [];
	const react: Array<Record<string, unknown>> = [];
	w.__perfMetrics = metrics;
	w.__perfReact = react;
	const ch = w.__STORYBOOK_ADDONS_CHANNEL__;
	if (!ch) return;
	ch.on(`${addon}/metrics-update`, (data: unknown) => {
		if (data && typeof data === "object") metrics.push(data as Record<string, unknown>);
	});
	ch.on(`${addon}/profiler-update`, (data: unknown) => {
		const record = data as { metrics?: Record<string, unknown> } | undefined;
		if (record?.metrics) react.push(record.metrics);
	});
}

/**
 * Runs in the MANAGER page: drive every range slider like a sustained drag —
 * a repeating min→max→min triangle at rAF cadence, values set through the native
 * setter so React's controlled inputs actually fire onChange.
 */
function driveSliders(durationMs: number, periodMs: number): Promise<DragResult> {
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
	const ranges = Array.from(document.querySelectorAll('input[type="range"]')) as HTMLInputElement[];
	const start = performance.now();
	let updates = 0;
	return new Promise<DragResult>((resolve) => {
		const tick = () => {
			const elapsed = performance.now() - start;
			if (elapsed >= durationMs || ranges.length === 0 || !setValue) {
				resolve({ sliders: ranges.length, updates });
				return;
			}
			const phase = (elapsed % periodMs) / periodMs;
			const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
			for (const range of ranges) {
				const min = Number(range.min) || 0;
				const max = Number(range.max) || 100;
				const stepSize = Number(range.step) || 1;
				const raw = min + (max - min) * triangle;
				const value = Math.round(raw / stepSize) * stepSize;
				setValue.call(range, String(value));
				range.dispatchEvent(new Event("input", { bubbles: true }));
				range.dispatchEvent(new Event("change", { bubbles: true }));
				updates++;
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
}

/** Runs in the MANAGER page: reduce the captured channel events to one row. */
function endCapture(): Summary {
	const w = window as unknown as ManagerWindow;
	const metricSamples = w.__perfMetrics ?? [];
	const reactSamples = w.__perfReact ?? [];
	const num = (obj: Record<string, unknown> | undefined, key: string): number | undefined => {
		const value = obj?.[key];
		return typeof value === "number" && Number.isFinite(value) ? value : undefined;
	};

	const first = metricSamples[0];
	const last = metricSamples[metricSamples.length - 1];
	let minFps = Number.POSITIVE_INFINITY;
	let maxFrame = 0;
	for (const sample of metricSamples) {
		const fps = num(sample, "fps");
		if (fps !== undefined && fps < minFps) minFps = fps;
		const worst = num(sample, "maxFrameTime") ?? num(sample, "frameTime");
		if (worst !== undefined && worst > maxFrame) maxFrame = worst;
	}
	// Counters accumulate from page load — take the delta across the drag window.
	const delta = (key: string) => Math.max(0, (num(last, key) ?? 0) - (num(first, key) ?? 0));
	const ratio = num(reactSamples[reactSamples.length - 1], "memoizationEfficiency") ?? 1;

	return {
		samples: metricSamples.length,
		minFps: Number.isFinite(minFps) ? Math.round(minFps) : 0,
		drops: delta("droppedFrames"),
		maxFrame: Math.round(maxFrame),
		styleWrites: delta("styleWrites"),
		longTasks: delta("longTasks"),
		reactP95: num(last, "reactP95Duration") ?? 0,
		savedPct: Math.round((1 - ratio) * 100),
	};
}

async function main() {
	const argv = process.argv.slice(2);
	const stories = argv.length > 0 ? argv : DEFAULT_STORIES;

	const browser = await puppeteer.launch({
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
		executablePath: CHROME,
		headless: true,
	});

	process.stdout.write(
		`\ndrag ${DRAG_MS}ms · sweep ${PERIOD_MS}ms · driving real range controls in the full manager\n` +
			"drops/styleW/longT are whole-preview (incl. a11y + StrictMode + chrome); react p95 is the only component-scoped number\n\n" +
			`${"story".padEnd(44)}${"sliders".padStart(8)}${"min fps".padStart(8)}${"drops".padStart(7)}${"max frame".padStart(11)}${"styleW".padStart(8)}${"longT".padStart(7)}${"react p95".padStart(11)}${"saved%".padStart(8)}\n`,
	);

	for (const id of stories) {
		const page = await browser.newPage();
		await page.setViewport({ width: 1280, height: 900 });
		try {
			await page.goto(`${BASE}/?path=/story/${id}`, {
				waitUntil: "domcontentloaded",
				timeout: 30_000,
			});
			const frame = await page
				.waitForFrame((f) => f.url().includes("iframe.html"), { timeout: 15_000 })
				.catch(() => null);
			if (frame) {
				await frame.waitForSelector("[data-slot]", { timeout: 10_000 }).catch(() => undefined);
			}
			await page.evaluate(ensureControls);
			await page.waitForSelector('input[type="range"]', { timeout: 8_000 }).catch(() => undefined);

			await page.evaluate(beginCapture, ADDON);
			await new Promise((r) => setTimeout(r, 250)); // let a baseline sample land
			const drive = (await page.evaluate(driveSliders, DRAG_MS, PERIOD_MS)) as DragResult;
			await new Promise((r) => setTimeout(r, 200));
			const s = (await page.evaluate(endCapture)) as Summary;

			process.stdout.write(
				`${id.padEnd(44)}${String(drive.sliders).padStart(8)}${String(s.minFps).padStart(8)}${String(s.drops).padStart(7)}${`${s.maxFrame}ms`.padStart(11)}${String(s.styleWrites).padStart(8)}${String(s.longTasks).padStart(7)}${`${s.reactP95.toFixed(2)}ms`.padStart(11)}${`${s.savedPct}%`.padStart(8)}\n`,
			);
			if (drive.sliders === 0) {
				process.stderr.write(`  ${id}: no range controls found — nothing to drag\n`);
			} else if (s.samples === 0) {
				process.stderr.write(`  ${id}: no metrics on the channel — is the addon enabled?\n`);
			}
		} catch (error) {
			process.stdout.write(
				`${id.padEnd(44)}  ERROR: ${error instanceof Error ? error.message : String(error)}\n`,
			);
		}
		await page.close();
	}

	await browser.close();
}

await main();
