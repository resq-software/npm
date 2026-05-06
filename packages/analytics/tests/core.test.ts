/**
 *
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
 *
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { Analytics, inferCookieDomain } from "../src/index";
import { ga4Stream, withAnalyticsRewrites } from "../src/next/index";

describe("inferCookieDomain", () => {
	it("returns the registrable root with a leading dot", () => {
		expect(
			inferCookieDomain(["resq.software", "research.resq.software", "viz.resq.software"]),
		).toBe(".resq.software");
	});

	it("handles a single subdomain by collapsing to its parent", () => {
		expect(inferCookieDomain(["app.example.com"])).toBe(".app.example.com");
	});

	it("returns undefined when there is no shared root", () => {
		expect(inferCookieDomain(["foo.com", "bar.org"])).toBeUndefined();
	});

	it("returns undefined for an empty list", () => {
		expect(inferCookieDomain([])).toBeUndefined();
	});

	it("strips a leading dot before comparing", () => {
		expect(inferCookieDomain([".resq.software", "research.resq.software"])).toBe(".resq.software");
	});
});

describe("ga4Stream", () => {
	it("builds a GA4 config with domains", () => {
		expect(ga4Stream("G-XXXXXXX", ["resq.software", "research.resq.software"])).toEqual({
			measurementId: "G-XXXXXXX",
			domains: ["resq.software", "research.resq.software"],
		});
	});

	it("omits domains when none provided", () => {
		expect(ga4Stream("G-XXXXXXX")).toEqual({
			measurementId: "G-XXXXXXX",
			domains: undefined,
		});
	});
});

describe("withAnalyticsRewrites", () => {
	it("prepends PostHog ingestion + assets rewrites", async () => {
		const wrapped = withAnalyticsRewrites({});
		const rules = await wrapped.rewrites?.();
		expect(Array.isArray(rules)).toBe(true);
		const list = rules as { source: string; destination: string }[];
		expect(list[0]).toEqual({
			source: "/ingest/static/:path*",
			destination: "https://us-assets.i.posthog.com/static/:path*",
		});
		expect(list[1]).toEqual({
			source: "/ingest/:path*",
			destination: "https://us.i.posthog.com/:path*",
		});
	});

	it("accepts a custom prefix and upstream", async () => {
		const wrapped = withAnalyticsRewrites(
			{},
			{ prefix: "/relay", upstream: "https://eu.i.posthog.com" },
		);
		const rules = (await wrapped.rewrites?.()) as {
			source: string;
			destination: string;
		}[];
		expect(rules[1]).toEqual({
			source: "/relay/:path*",
			destination: "https://eu.i.posthog.com/:path*",
		});
	});

	it("preserves existing rewrites returned as an array", async () => {
		const wrapped = withAnalyticsRewrites({
			rewrites: () => [{ source: "/old", destination: "/new" }],
		});
		const rules = (await wrapped.rewrites?.()) as {
			source: string;
			destination: string;
		}[];
		expect(rules.at(-1)).toEqual({ source: "/old", destination: "/new" });
	});

	it("preserves existing rewrites returned as a beforeFiles object", async () => {
		const wrapped = withAnalyticsRewrites({
			rewrites: () => ({
				beforeFiles: [{ source: "/legacy", destination: "/v2" }],
			}),
		});
		const out = (await wrapped.rewrites?.()) as {
			beforeFiles: { source: string; destination: string }[];
		};
		expect(out.beforeFiles.at(-1)).toEqual({
			source: "/legacy",
			destination: "/v2",
		});
	});

	it("sets skipTrailingSlashRedirect so /ingest never gets redirected", () => {
		const wrapped = withAnalyticsRewrites({});
		expect(wrapped.skipTrailingSlashRedirect).toBe(true);
	});
});

describe("Analytics class", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("debug mode logs track calls without throwing when transports absent", async () => {
		const a = new Analytics();
		const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
		await a.init({ debug: true, disabled: true });
		a.track("cta_clicked", { id: "hero", section: "landing" });
		expect(debugSpy).toHaveBeenCalledWith("[analytics] track", "cta_clicked", {
			id: "hero",
			section: "landing",
		});
	});

	it("track is a no-op before init", () => {
		const a = new Analytics();
		expect(() => a.track("anything", { x: 1 })).not.toThrow();
	});

	it("identify is a no-op before init", () => {
		const a = new Analytics();
		expect(() => a.identify("user-1", { plan: "civilian" })).not.toThrow();
	});

	it("reset clears config and allows re-init", async () => {
		const a = new Analytics();
		await a.init({ disabled: true });
		expect(a.config).not.toBeNull();
		a.reset();
		expect(a.config).toBeNull();
	});

	it("disabled mode still records config but skips dispatch", async () => {
		const a = new Analytics();
		await a.init({ disabled: true, ga4: { measurementId: "G-X" } });
		expect(a.config?.disabled).toBe(true);
		expect(() => a.track("noop")).not.toThrow();
	});

	it("track + identify drop nested values when sending to GA4", async () => {
		const captured: unknown[][] = [];
		(globalThis as { window?: unknown }).window = {
			dataLayer: { push: (args: unknown[]) => captured.push(args) },
		};
		const a = new Analytics();
		await a.init({ ga4: { measurementId: "G-X" } });
		a.track("cta_clicked", {
			id: "hero",
			section: "landing",
			nested: { not: "allowed" },
			arr: [1, 2],
			count: 3,
		});
		const eventCall = captured.find((c) => c[0] === "event" && c[1] === "cta_clicked");
		expect(eventCall?.[2]).toEqual({ id: "hero", section: "landing", count: 3 });
		delete (globalThis as { window?: unknown }).window;
	});

	it("reset clears the GA4 user_id before tearing down", async () => {
		const captured: unknown[][] = [];
		(globalThis as { window?: unknown }).window = {
			dataLayer: { push: (args: unknown[]) => captured.push(args) },
		};
		const a = new Analytics();
		await a.init({ ga4: { measurementId: "G-X" } });
		a.identify("user-1");
		a.reset();
		const resetConfig = captured.findLast(
			(c) => c[0] === "config" && (c[2] as { user_id?: unknown })?.user_id === null,
		);
		expect(resetConfig).toBeDefined();
		delete (globalThis as { window?: unknown }).window;
	});
});
