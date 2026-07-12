/**
 *
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
 *
 */

import type { LiteralUnion } from "@resq-systems/types";
import type { PostHog, PostHogConfig } from "posthog-js";
import type { Ga4MeasurementId, ResqSubdomain } from "./resq";

/**
 * Augmentable typed event registry. Consumers extend this via module
 * augmentation to get type-safe `track()` calls:
 *
 * ```ts
 * declare module "@resq-systems/analytics" {
 *   interface AnalyticsEvents {
 *     "briefing_requested": { tier: "civilian" | "defense" };
 *     "cta_clicked": { id: string; section: string };
 *   }
 * }
 * ```
 *
 * The base is intentionally empty (no string index signature): a signature
 * would collapse {@link EventName} to plain `string` and destroy autocomplete.
 * Keys only exist once a consumer augments this interface.
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmentation-only registry — a body would add an index signature and collapse EventName to string
export interface AnalyticsEvents {}

export interface PostHogProviderConfig {
	key: string;
	host?: string;
	uiHost?: string;
	options?: Partial<PostHogConfig>;
}

export interface GA4ProviderConfig {
	measurementId: Ga4MeasurementId;
	domains?: LiteralUnion<ResqSubdomain>[];
}

export interface AnalyticsConfig {
	posthog?: PostHogProviderConfig;
	ga4?: GA4ProviderConfig;
	cookieDomain?: string;
	disabled?: boolean;
	debug?: boolean;
}

/**
 * The set of trackable event names. Falls back to plain `string` until a
 * consumer augments {@link AnalyticsEvents}; once augmented, it becomes the
 * union of registered keys plus `(string & {})` so ad-hoc names still compile
 * while registered names autocomplete.
 */
export type EventName = keyof AnalyticsEvents extends never
	? string
	: keyof AnalyticsEvents | (string & {});

/**
 * Arguments accepted by {@link Analytics.track} after the event name, as a
 * rest tuple. For a registered event the payload arg is **required** exactly
 * when its type has at least one required key (`{}` is not assignable to it),
 * and optional otherwise. Unregistered names accept an optional free-form
 * property bag.
 */
export type TrackArgs<E extends EventName> = E extends keyof AnalyticsEvents
	? undefined extends AnalyticsEvents[E]
		? [properties?: AnalyticsEvents[E]]
		: // biome-ignore lint/complexity/noBannedTypes: `{} extends T` is the canonical "T has no required keys" probe
			{} extends AnalyticsEvents[E]
			? [properties?: AnalyticsEvents[E]]
			: [properties: AnalyticsEvents[E]]
	: [properties?: Record<string, unknown>];

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

/**
 * Inject the gtag.js loader script once per measurement ID. Idempotent —
 * keyed off a `data-resq-ga4` attribute so repeat calls are no-ops.
 */
const loadGa4Script = (measurementId: string): void => {
	if (typeof document === "undefined") return;
	const selector = `script[data-resq-ga4="${measurementId}"]`;
	if (document.querySelector(selector)) return;
	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
	script.dataset.resqGa4 = measurementId;
	document.head.appendChild(script);
};

/**
 * GA4 only accepts flat objects with primitive values for event params and
 * user properties. Filter out anything else so a stray nested object can't
 * silently drop the whole event server-side.
 */
const primitivesOnly = (
	props?: Record<string, unknown>,
): Record<string, string | number | boolean> => {
	if (!props) return {};
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(props)) {
		if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
			out[k] = v;
		}
	}
	return out;
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
		loadGa4Script(provider.measurementId);
		gtag("js", new Date());
		const params: Record<string, unknown> = {};
		if (provider.domains?.length) {
			params.linker = { domains: provider.domains };
		}
		gtag("config", provider.measurementId, params);
	}

	track<E extends EventName>(event: E, ...args: TrackArgs<E>): void {
		if (!this.#config) return;
		const [properties] = args as [Record<string, unknown> | undefined];
		if (this.#config.debug) {
			console.debug("[analytics] track", event, properties);
		}
		if (this.#config.disabled) return;
		this.#posthog?.capture(event, properties);
		if (this.#config.ga4) {
			gtag("event", event, primitivesOnly(properties));
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
			gtag("set", "user_properties", primitivesOnly(traits));
			gtag("config", this.#config.ga4.measurementId, { user_id: userId });
		}
	}

	reset(): void {
		if (this.#config?.ga4) {
			gtag("config", this.#config.ga4.measurementId, { user_id: null });
		}
		this.#posthog?.reset();
		this.#config = null;
		this.#posthog = null;
		this.#initPromise = null;
	}

	/**
	 * Manually emit a pageview. Most consumers do **not** need to call this:
	 * PostHog's `capture_pageview: "history_change"` (set in init) auto-captures
	 * SPA navigation, and GA4's Enhanced Measurement (UI default) does the same
	 * for gtag.js. Only call manually if you've disabled both auto-captures, or
	 * for first-paint pageviews before init has resolved.
	 */
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

export function track<E extends EventName>(event: E, ...args: TrackArgs<E>): void {
	analytics.track(event, ...args);
}

export const identify = (userId: string, traits?: Record<string, unknown>): void =>
	analytics.identify(userId, traits);

export const reset = (): void => analytics.reset();

export const pageview = (url?: string): void => analytics.pageview(url);

// ResQ-specific helpers shared across the three TS surfaces. Centralised
// here so adding a fourth subdomain or tightening the GA4-ID regex is one
// version bump instead of three coordinated edits in the consumer repos.
export {
	GA4_ID_PATTERN,
	RESQ_SUBDOMAIN_ALLOWLIST,
	resolveResqCookieDomain,
	sanitizeGa4Id,
} from "./resq";
export type { Ga4MeasurementId, ResqSubdomain } from "./resq";

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
