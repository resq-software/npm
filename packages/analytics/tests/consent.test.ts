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

import { unsafeBrand } from "@resq-systems/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	Analytics,
	type AnalyticsConfig,
	CONSENT_STORAGE_KEY,
	type ConsentState,
	type Ga4MeasurementId,
	localStorageConsentStore,
} from "../src/index";

// `posthog-js` is only ever reached through the dynamic import in Analytics.
// Counting factory runs tells us whether the SDK was loaded at all.
const posthogModule = vi.hoisted(() => ({
	loads: 0,
	client: {
		init: vi.fn(),
		capture: vi.fn(),
		identify: vi.fn(),
		reset: vi.fn(),
		opt_out_capturing: vi.fn(),
		opt_in_capturing: vi.fn(),
	},
}));

vi.mock("posthog-js", () => {
	posthogModule.loads += 1;
	return { default: posthogModule.client };
});

const GA4_ID = unsafeBrand<"Ga4MeasurementId", string>("G-TEST1234") as Ga4MeasurementId;
const CONFIG: AnalyticsConfig = {
	posthog: { key: "phc_test" },
	ga4: { measurementId: GA4_ID },
};

interface FakeBrowser {
	window: Record<string, unknown> & { dataLayer?: unknown[] };
	scripts: { src: string }[];
	storage: Map<string, string>;
	cookies: Map<string, string>;
}

/**
 * Install a minimal `window` / `document` pair that records every script the
 * package injects and every value it stores. Nothing here can reach a network.
 */
const installBrowser = (stored?: ConsentState): FakeBrowser => {
	const storage = new Map<string, string>();
	if (stored && stored !== "unset") storage.set(CONSENT_STORAGE_KEY, stored);
	const cookies = new Map<string, string>();
	const scripts: { src: string }[] = [];
	const win: FakeBrowser["window"] = {
		localStorage: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
		},
	};
	const doc = {
		head: { appendChild: (el: { src: string }) => scripts.push(el) },
		querySelector: () => null,
		createElement: () => ({ dataset: {}, src: "" }),
		get cookie(): string {
			return [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
		},
		set cookie(value: string) {
			const [pair = ""] = value.split(";");
			const [name = "", val = ""] = pair.split("=");
			if (/max-age=0/i.test(value)) cookies.delete(name.trim());
			else cookies.set(name.trim(), val);
		},
	};
	(globalThis as { window?: unknown }).window = win;
	(globalThis as { document?: unknown }).document = doc;
	return { window: win, scripts, storage, cookies };
};

/** Every observable sign that a tracker was loaded or fed. */
const trackerActivity = (browser: FakeBrowser) => ({
	sdkImported: posthogModule.loads > 0,
	posthogInit: posthogModule.client.init.mock.calls.length,
	posthogCaptures: posthogModule.client.capture.mock.calls.length,
	scripts: browser.scripts.map((s) => s.src),
	dataLayer: browser.window.dataLayer?.length ?? 0,
});

const NOTHING_LOADED = {
	sdkImported: false,
	posthogInit: 0,
	posthogCaptures: 0,
	scripts: [],
	dataLayer: 0,
};

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	posthogModule.loads = 0;
});

afterEach(() => {
	delete (globalThis as { window?: unknown }).window;
	delete (globalThis as { document?: unknown }).document;
});

describe("analytics consent", () => {
	it("loads no tracker before the visitor accepts", async () => {
		const browser = installBrowser();
		const a = new Analytics();

		await a.init(CONFIG);
		a.pageview();
		a.track("cta_clicked", { id: "hero" });
		a.identify("user-1", { plan: "civilian" });

		expect(a.consent).toBe("unset");
		expect(trackerActivity(browser)).toEqual(NOTHING_LOADED);
	});

	it("keeps every provider unloaded after a decline, including on the next visit", async () => {
		const browser = installBrowser();
		const first = new Analytics();
		await first.init(CONFIG);
		first.denyConsent();
		first.track("cta_clicked");

		expect(browser.storage.get(CONSENT_STORAGE_KEY)).toBe("denied");

		const nextVisit = new Analytics();
		await nextVisit.init(CONFIG);
		nextVisit.pageview();

		expect(nextVisit.consent).toBe("denied");
		expect(trackerActivity(browser)).toEqual(NOTHING_LOADED);
	});

	it("boots PostHog and GA4 once the visitor accepts, with ad signals off", async () => {
		const browser = installBrowser();
		const a = new Analytics();
		await a.init(CONFIG);
		expect(trackerActivity(browser)).toEqual(NOTHING_LOADED);

		await a.grantConsent();

		expect(browser.storage.get(CONSENT_STORAGE_KEY)).toBe("granted");
		expect(posthogModule.client.init).toHaveBeenCalledWith(
			"phc_test",
			expect.objectContaining({ api_host: "https://us.i.posthog.com" }),
		);
		expect(browser.scripts).toEqual([
			expect.objectContaining({
				src: "https://www.googletagmanager.com/gtag/js?id=G-TEST1234",
			}),
		]);
		// Consent Mode defaults are queued before gtag.js configures the stream, as
		// an `arguments` object: gtag.js ignores a plain array.
		const first = browser.window.dataLayer?.[0];
		expect(Object.prototype.toString.call(first)).toBe("[object Arguments]");
		expect(Array.from(first as ArrayLike<unknown>)).toEqual([
			"consent",
			"default",
			{
				ad_storage: "denied",
				ad_user_data: "denied",
				ad_personalization: "denied",
				analytics_storage: "granted",
			},
		]);

		a.track("cta_clicked", { id: "hero" });
		expect(posthogModule.client.capture).toHaveBeenCalledWith("cta_clicked", { id: "hero" });
	});

	it("boots on init when an earlier acceptance is stored", async () => {
		const browser = installBrowser("granted");
		const a = new Analytics();

		await a.init(CONFIG);

		expect(posthogModule.client.init).toHaveBeenCalledTimes(1);
		expect(browser.scripts).toHaveLength(1);
	});

	it("switches loaded providers off when the visitor withdraws", async () => {
		const browser = installBrowser("granted");
		browser.cookies.set("_ga", "GA1.1.123");
		browser.cookies.set("_ga_TEST1234", "GS1.1.456");
		browser.cookies.set("theme", "dark");
		const a = new Analytics();
		await a.init(CONFIG);

		a.denyConsent();
		a.track("after_withdrawal");

		expect(browser.storage.get(CONSENT_STORAGE_KEY)).toBe("denied");
		expect(posthogModule.client.opt_out_capturing).toHaveBeenCalledTimes(1);
		expect(posthogModule.client.capture).not.toHaveBeenCalled();
		expect(browser.window["ga-disable-G-TEST1234"]).toBe(true);
		expect([...browser.cookies.keys()]).toEqual(["theme"]);
	});

	it("re-enables providers when the visitor accepts again on the same page", async () => {
		const browser = installBrowser("granted");
		const a = new Analytics();
		await a.init(CONFIG);
		a.denyConsent();

		await a.grantConsent();

		expect(posthogModule.client.opt_in_capturing).toHaveBeenCalledTimes(1);
		expect(posthogModule.client.init).toHaveBeenCalledTimes(1);
		expect(browser.window["ga-disable-G-TEST1234"]).toBe(false);
	});

	it("never initialises PostHog when the visitor declines while the SDK is loading", async () => {
		const browser = installBrowser();
		const a = new Analytics();
		await a.init(CONFIG);

		const booting = a.grantConsent();
		a.denyConsent();
		await booting;

		expect(posthogModule.client.init).not.toHaveBeenCalled();
		expect(browser.scripts).toEqual([]);
	});

	it("records an early decision and applies it at init", async () => {
		const browser = installBrowser();
		const a = new Analytics();

		await a.grantConsent();
		expect(trackerActivity(browser)).toEqual(NOTHING_LOADED);

		await a.init(CONFIG);
		expect(posthogModule.client.init).toHaveBeenCalledTimes(1);
	});

	it("does not boot a disabled config even with consent", async () => {
		const browser = installBrowser("granted");
		const a = new Analytics();

		await a.init({ ...CONFIG, disabled: true });

		expect(trackerActivity(browser)).toEqual(NOTHING_LOADED);
	});

	it("notifies listeners of each decision until unsubscribed", () => {
		installBrowser();
		const a = new Analytics();
		const seen: ConsentState[] = [];
		const unsubscribe = a.onConsentChange((state) => seen.push(state));

		a.denyConsent();
		unsubscribe();
		void a.grantConsent();

		expect(seen).toEqual(["denied"]);
	});

	it("keeps the decision in memory when storage is blocked", async () => {
		const browser = installBrowser();
		Object.defineProperty(browser.window, "localStorage", {
			get() {
				throw new Error("SecurityError: site data blocked");
			},
		});
		const a = new Analytics();

		expect(localStorageConsentStore.read()).toBe("unset");
		await a.init(CONFIG);
		await a.grantConsent();

		expect(a.consent).toBe("granted");
		expect(posthogModule.client.init).toHaveBeenCalledTimes(1);
	});

	it("accepts a custom consent store", async () => {
		const browser = installBrowser();
		const written: string[] = [];
		const a = new Analytics({
			consentStore: { read: () => "denied", write: (d) => written.push(d) },
		});

		await a.init(CONFIG);
		expect(trackerActivity(browser)).toEqual(NOTHING_LOADED);

		await a.grantConsent();
		expect(written).toEqual(["granted"]);
		expect(posthogModule.client.init).toHaveBeenCalledTimes(1);
	});
});
