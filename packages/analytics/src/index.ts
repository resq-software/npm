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

import type { PostHog, PostHogConfig } from "posthog-js";

/**
 * Augmentable typed event registry. Consumers extend this via module
 * augmentation to get type-safe `track()` calls:
 *
 * ```ts
 * declare module "@resq-sw/analytics" {
 *   interface AnalyticsEvents {
 *     "briefing_requested": { tier: "civilian" | "defense" };
 *     "cta_clicked": { id: string; section: string };
 *   }
 * }
 * ```
 */
export interface AnalyticsEvents {
	[event: string]: Record<string, unknown> | undefined;
}

export interface PostHogProviderConfig {
	key: string;
	host?: string;
	uiHost?: string;
	options?: Partial<PostHogConfig>;
}

export interface GA4ProviderConfig {
	measurementId: string;
	domains?: string[];
}

export interface AnalyticsConfig {
	posthog?: PostHogProviderConfig;
	ga4?: GA4ProviderConfig;
	cookieDomain?: string;
	disabled?: boolean;
	debug?: boolean;
}

type EventName = keyof AnalyticsEvents | (string & {});

interface GtagWindow {
	gtag?: (...args: unknown[]) => void;
	dataLayer?: unknown[];
}

const isBrowser = (): boolean => typeof window !== "undefined";

const gtag = (...args: unknown[]): void => {
	if (!isBrowser()) return;
	const w = window as unknown as GtagWindow;
	w.dataLayer = w.dataLayer ?? [];
	if (typeof w.gtag === "function") {
		w.gtag(...args);
	} else {
		w.dataLayer.push(args);
	}
};

export class Analytics {
	#config: AnalyticsConfig | null = null;
	#posthog: PostHog | null = null;
	#initPromise: Promise<void> | null = null;

	get config(): Readonly<AnalyticsConfig> | null {
		return this.#config;
	}

	get posthog(): PostHog | null {
		return this.#posthog;
	}

	init(config: AnalyticsConfig): Promise<void> {
		if (this.#initPromise) return this.#initPromise;
		this.#config = config;
		this.#initPromise = this.#bootstrap(config);
		return this.#initPromise;
	}

	async #bootstrap(config: AnalyticsConfig): Promise<void> {
		if (config.disabled || !isBrowser()) return;
		if (config.posthog) await this.#initPostHog(config);
		if (config.ga4) this.#initGa4(config.ga4);
	}

	async #initPostHog(config: AnalyticsConfig): Promise<void> {
		const provider = config.posthog;
		if (!provider) return;
		const mod = await import("posthog-js");
		const posthog = (mod as { default?: PostHog }).default ?? (mod as unknown as PostHog);
		const baseOptions: Partial<PostHogConfig> = {
			api_host: provider.host ?? "https://us.i.posthog.com",
			ui_host: provider.uiHost,
			capture_pageview: "history_change",
			person_profiles: "identified_only",
			cross_subdomain_cookie: true,
		};
		if (config.cookieDomain) {
			(baseOptions as Record<string, unknown>).cookie_domain = config.cookieDomain;
		}
		posthog.init(provider.key, { ...baseOptions, ...provider.options });
		this.#posthog = posthog;
	}

	#initGa4(provider: GA4ProviderConfig): void {
		gtag("js", new Date());
		const params: Record<string, unknown> = {};
		if (provider.domains?.length) {
			params.linker = { domains: provider.domains };
		}
		gtag("config", provider.measurementId, params);
	}

	track<E extends EventName>(
		event: E,
		properties?: E extends keyof AnalyticsEvents ? AnalyticsEvents[E] : Record<string, unknown>,
	): void {
		if (!this.#config) return;
		if (this.#config.debug) {
			console.debug("[analytics] track", event, properties);
		}
		if (this.#config.disabled) return;
		this.#posthog?.capture(event as string, properties as Record<string, unknown>);
		if (this.#config.ga4) {
			gtag("event", event, properties ?? {});
		}
	}

	identify(userId: string, traits?: Record<string, unknown>): void {
		if (!this.#config) return;
		if (this.#config.debug) {
			console.debug("[analytics] identify", userId, traits);
		}
		if (this.#config.disabled) return;
		this.#posthog?.identify(userId, traits);
		if (this.#config.ga4) {
			gtag("set", "user_properties", traits ?? {});
			gtag("config", this.#config.ga4.measurementId, { user_id: userId });
		}
	}

	reset(): void {
		this.#posthog?.reset();
		this.#config = null;
		this.#posthog = null;
		this.#initPromise = null;
	}

	pageview(url?: string): void {
		if (!this.#config || this.#config.disabled) return;
		this.#posthog?.capture("$pageview", url ? { $current_url: url } : undefined);
		if (this.#config.ga4) {
			gtag("event", "page_view", url ? { page_location: url } : {});
		}
	}
}

export const analytics = new Analytics();

export const initAnalytics = (config: AnalyticsConfig): Promise<void> => analytics.init(config);

export const track: Analytics["track"] = (event, properties) => analytics.track(event, properties);

export const identify = (userId: string, traits?: Record<string, unknown>): void =>
	analytics.identify(userId, traits);

export const reset = (): void => analytics.reset();

export const pageview = (url?: string): void => analytics.pageview(url);

export const inferCookieDomain = (domains: string[]): string | undefined => {
	if (domains.length === 0) return undefined;
	const parts = domains.map((d) => d.replace(/^\./, "").split("."));
	const minLen = Math.min(...parts.map((p) => p.length));
	let shared: string | undefined;
	for (let i = 1; i <= minLen; i++) {
		const slice = parts.map((p) => p.slice(-i).join("."));
		if (slice.every((s) => s === slice[0])) {
			shared = slice[0];
		} else {
			break;
		}
	}
	if (!shared?.includes(".")) return undefined;
	return `.${shared}`;
};
