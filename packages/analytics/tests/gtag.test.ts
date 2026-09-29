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

/**
 * @fileoverview How GA4 commands reach gtag.js. gtag.js runs only commands
 * queued as `arguments` objects, which is what Google's snippet does
 * (`function gtag(){dataLayer.push(arguments);}`); a plain array pushed onto
 * `dataLayer` is ignored, so GA4 would collect nothing.
 */

import { unsafeBrand } from "@resq-systems/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	Analytics,
	type AnalyticsConfig,
	type ConsentStore,
	type Ga4MeasurementId,
} from "../src/index";

const GA4_ID = unsafeBrand<"Ga4MeasurementId", string>("G-TEST1234") as Ga4MeasurementId;

type GtagFn = (...args: unknown[]) => void;

interface FakeWindow {
	dataLayer?: unknown[];
	gtag?: GtagFn;
	[key: string]: unknown;
}

/** A `window` / `document` pair with no network: scripts are only recorded. */
const installBrowser = (win: FakeWindow = {}): FakeWindow => {
	(globalThis as { window?: unknown }).window = win;
	(globalThis as { document?: unknown }).document = {
		head: { appendChild: () => undefined },
		querySelector: () => null,
		createElement: () => ({ dataset: {}, src: "" }),
		cookie: "",
	};
	return win;
};

/** Consent kept in memory, so the tests need no `localStorage`. */
const memoryStore = (): ConsentStore => {
	let state: "granted" | "denied" | null = null;
	return {
		read: () => state ?? "unset",
		write: (decision) => {
			state = decision;
		},
	};
};

const isArguments = (value: unknown): boolean =>
	Object.prototype.toString.call(value) === "[object Arguments]";

/** The queued commands as plain arrays, for readable comparisons. */
const commands = (win: FakeWindow): unknown[][] =>
	(win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));

const bootGa4 = async (ga4: Partial<NonNullable<AnalyticsConfig["ga4"]>> = {}) => {
	const a = new Analytics({ consentStore: memoryStore() });
	await a.init({ ga4: { measurementId: GA4_ID, ...ga4 } });
	await a.grantConsent();
	return a;
};

afterEach(() => {
	delete (globalThis as { window?: unknown }).window;
	delete (globalThis as { document?: unknown }).document;
	vi.restoreAllMocks();
});

describe("gtag command queue", () => {
	it("queues every command as an arguments object, as Google's snippet does", async () => {
		const win = installBrowser();
		const a = await bootGa4({ domains: ["resq.software"] });
		a.track("cta_clicked", { id: "hero" });
		a.identify("user-1", { plan: "civilian" });
		a.pageview("https://resq.software/");
		a.reset();

		expect(win.dataLayer?.length).toBeGreaterThan(0);
		for (const entry of win.dataLayer ?? []) {
			expect(isArguments(entry)).toBe(true);
		}
		expect(commands(win).slice(0, 3)).toEqual([
			[
				"consent",
				"default",
				{
					ad_storage: "denied",
					ad_user_data: "denied",
					ad_personalization: "denied",
					analytics_storage: "granted",
				},
			],
			["js", expect.any(Date)],
			["config", "G-TEST1234", { linker: { domains: ["resq.software"] } }],
		]);
		expect(commands(win)).toContainEqual(["event", "cta_clicked", { id: "hero" }]);
		const linker = { domains: ["resq.software"] };
		expect(commands(win)).toContainEqual(["config", "G-TEST1234", { linker, user_id: "user-1" }]);
		expect(commands(win)).toContainEqual(["config", "G-TEST1234", { linker, user_id: null }]);
	});

	it("queues consent updates on withdrawal and re-acceptance as arguments objects", async () => {
		const win = installBrowser();
		const a = await bootGa4();
		const booted = win.dataLayer?.length ?? 0;

		a.denyConsent();
		await a.grantConsent();

		const updates = (win.dataLayer ?? []).slice(booted);
		expect(updates.every(isArguments)).toBe(true);
		expect(updates.map((entry) => Array.from(entry as ArrayLike<unknown>))).toEqual([
			["consent", "update", { analytics_storage: "denied" }],
			["consent", "update", { analytics_storage: "granted" }],
		]);
	});

	it("defines window.gtag the documented way once the visitor accepts, and not before", async () => {
		const win = installBrowser();
		const a = new Analytics({ consentStore: memoryStore() });
		await a.init({ ga4: { measurementId: GA4_ID } });
		expect(win.gtag).toBeUndefined();
		expect(win.dataLayer).toBeUndefined();

		await a.grantConsent();
		expect(typeof win.gtag).toBe("function");

		const before = win.dataLayer?.length ?? 0;
		win.gtag?.("event", "from_the_page");
		const pushed = win.dataLayer?.[before];
		expect(isArguments(pushed)).toBe(true);
		expect(Array.from(pushed as ArrayLike<unknown>)).toEqual(["event", "from_the_page"]);
	});

	it("routes commands through a gtag function the page already defined", async () => {
		const calls: unknown[][] = [];
		const pageGtag: GtagFn = (...args) => {
			calls.push(args);
		};
		const win = installBrowser({ gtag: pageGtag });
		const a = await bootGa4();
		a.track("cta_clicked");

		expect(win.gtag).toBe(pageGtag);
		expect(calls[0]?.[0]).toBe("consent");
		expect(calls).toContainEqual(["config", "G-TEST1234", {}]);
		expect(calls).toContainEqual(["event", "cta_clicked", {}]);
	});
});

describe("GA4 config params", () => {
	const PRIVACY = { allow_google_signals: false, allow_ad_personalization_signals: false };

	it("sends the consumer's config params on the config command", async () => {
		const win = installBrowser();
		await bootGa4({ domains: ["resq.software"], configParams: PRIVACY });

		expect(commands(win)).toContainEqual([
			"config",
			"G-TEST1234",
			{ linker: { domains: ["resq.software"] }, ...PRIVACY },
		]);
	});

	it("keeps the consumer's config params on the identify and reset config commands", async () => {
		const win = installBrowser();
		const a = await bootGa4({ configParams: PRIVACY });
		a.identify("user-1");
		a.reset();

		const configs = commands(win).filter((c) => c[0] === "config");
		expect(configs).toEqual([
			["config", "G-TEST1234", { ...PRIVACY }],
			["config", "G-TEST1234", { ...PRIVACY, user_id: "user-1" }],
			["config", "G-TEST1234", { ...PRIVACY, user_id: null }],
		]);
	});

	it("queues nothing for GA4 before consent, even with config params set", async () => {
		const win = installBrowser();
		const a = new Analytics({ consentStore: memoryStore() });
		await a.init({ ga4: { measurementId: GA4_ID, configParams: PRIVACY } });

		expect(win.dataLayer).toBeUndefined();
		expect(win.gtag).toBeUndefined();
	});
});
