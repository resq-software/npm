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

/**
 * @fileoverview Framework-agnostic core of the unified PostHog + GA4 analytics
 * client: the typed event registry, the lazy-loading {@link Analytics}
 * singleton, and the standalone `track`/`identify`/`reset`/`pageview` helpers.
 *
 * @module @resq-systems/analytics
 */

import type { LiteralUnion } from "@resq-systems/types";
import type { PostHog, PostHogConfig } from "posthog-js";
import {
	type CookieDomain,
	type Ga4MeasurementId,
	type ResqSubdomain,
	toCookieDomain,
} from "./resq";

//#region Types

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

/**
 * PostHog provider credentials and init overrides. The `key` is the only
 * required field; `host`/`uiHost` target non-default (EU or self-hosted)
 * regions and `options` is merged over the package defaults set in
 * {@link Analytics.init}.
 */
export interface PostHogProviderConfig {
	key: string;
	host?: string;
	uiHost?: string;
	options?: Partial<PostHogConfig>;
}

/**
 * GA4 provider config. `measurementId` is the branded {@link Ga4MeasurementId}
 * so only a sanitized ID reaches gtag; `domains` seeds the cross-subdomain
 * linker allow-list. Build one ergonomically with `ga4Stream` from
 * `@resq-systems/analytics/next`.
 */
export interface GA4ProviderConfig {
	measurementId: Ga4MeasurementId;
	domains?: LiteralUnion<ResqSubdomain>[];
}

/**
 * Top-level analytics configuration passed to {@link Analytics.init}. Both
 * providers are optional so a consumer can run PostHog only, GA4 only, or
 * neither (e.g. `disabled` in preview environments).
 */
export interface AnalyticsConfig {
	posthog?: PostHogProviderConfig;
	ga4?: GA4ProviderConfig;
	/**
	 * Cross-subdomain cookie domain in normalized leading-dot form. Typed as the
	 * nominal {@link CookieDomain} so a bare host string is a compile error here:
	 * mint one with {@link toCookieDomain} / {@link inferCookieDomain} or take it
	 * from {@link resolveResqCookieDomain}.
	 */
	cookieDomain?: CookieDomain;
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

/**
 * A single flat GA4 parameter value. GA4 rejects nested objects and arrays for
 * event params and user properties, so the leaf type is deliberately narrow.
 * `null` is included because clearing a value (e.g. `user_id: null` on reset) is
 * a first-class GA4 operation.
 */
type GtagParamValue = string | number | boolean | null | undefined;

/**
 * Flat parameter bag for `gtag("event", …)` and `gtag("set", …)`. Values are
 * primitives only — {@link primitivesOnly} enforces this at runtime; the type
 * enforces it at the call site.
 */
export type GtagEventParams = Readonly<Record<string, GtagParamValue>>;

/**
 * Parameters for `gtag("config", id, …)`. A superset of {@link GtagEventParams}
 * that also allows the two structured fields this package sets: the
 * cross-subdomain `linker` allow-list and the identity `user_id`. The tail is
 * widened to those value shapes (never `any`) so ad-hoc config keys still type.
 */
export interface GtagConfigParams {
	readonly linker?: { readonly domains?: readonly string[] };
	readonly user_id?: string | null;
	readonly [key: string]: GtagParamValue | { readonly domains?: readonly string[] };
}

/**
 * The discriminated union of gtag command tuples this package emits, keyed off
 * the first element (the command verb). Modeling the calls this way turns every
 * `gtag(...)` call site into a checked one: a wrong arity, a raw (unbranded)
 * measurement id, or a nested event param is a compile error rather than a
 * value silently dropped by GA4 at runtime.
 *
 * Covers the verbs actually used here (`js`, `config`, `event`, `set`) plus
 * `consent`, which is part of the gtag contract and cheap to model ahead of
 * need. Extend this union when a new verb is introduced.
 */
export type GtagCommand =
	| ["js", Date]
	| ["config", Ga4MeasurementId, GtagConfigParams?]
	| ["event", string, GtagEventParams?]
	| ["set", string, GtagEventParams]
	| ["consent", "default" | "update", Readonly<Record<string, "granted" | "denied">>];

interface GtagWindow {
	gtag?: (...args: GtagCommand) => void;
	dataLayer?: GtagCommand[];
}

//#endregion

//#region Internal

const isBrowser = (): boolean => typeof window !== "undefined";

const gtag = (...args: GtagCommand): void => {
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

//#endregion

//#region Public API

/**
 * Unified analytics facade over PostHog and GA4. A single shared instance
 * ({@link analytics}) is initialised once via {@link Analytics.init}; every
 * method is a no-op until then and while `disabled`, so call sites never need
 * their own guards.
 *
 * PostHog is imported lazily on init so non-analytics page loads pay nothing,
 * and every event fans out to whichever providers are configured.
 *
 * @example
 * ```ts
 * const a = new Analytics();
 * await a.init({ posthog: { key: "phc_…" } });
 * a.track("cta_clicked", { id: "hero" });
 * ```
 */
export class Analytics {
	#config: AnalyticsConfig | null = null;
	#posthog: PostHog | null = null;
	#initPromise: Promise<void> | null = null;

	/** The active configuration, or `null` before init / after {@link reset}. */
	get config(): Readonly<AnalyticsConfig> | null {
		return this.#config;
	}

	/**
	 * The lazily-loaded PostHog client, or `null` until PostHog init resolves.
	 * Exposed for advanced features (feature flags, group identify) not on this
	 * facade.
	 */
	get posthog(): PostHog | null {
		return this.#posthog;
	}

	/**
	 * Initialise the client and lazily boot the configured providers.
	 * Idempotent: the first call wins and later calls return the same promise,
	 * so a double-mount never re-inits PostHog / GA4.
	 *
	 * @param config - PostHog/GA4 credentials plus cross-subdomain and debug flags.
	 * @returns A promise that resolves once provider bootstrapping has settled.
	 */
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
		const params: GtagConfigParams = provider.domains?.length
			? { linker: { domains: provider.domains } }
			: {};
		gtag("config", provider.measurementId, params);
	}

	/**
	 * Emit an event to every configured provider. Registered events (via
	 * {@link AnalyticsEvents} augmentation) get a typed, sometimes-required
	 * payload; ad-hoc names accept an optional free-form bag. GA4 params are
	 * flattened to primitives by {@link primitivesOnly} before dispatch.
	 *
	 * @template E - The event name, narrowed to a registered key when one exists.
	 * @param event - The event name.
	 * @param args - The event payload, shaped by {@link TrackArgs}.
	 * @example
	 * ```ts
	 * analytics.track("cta_clicked", { id: "hero" });
	 * ```
	 */
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

	/**
	 * Bind a stable identity to the current session across both providers. Call
	 * on sign-in; GA4 traits are flattened to primitives and the `user_id` is set
	 * on the measurement config.
	 *
	 * @param userId - The stable user identifier.
	 * @param traits - Optional user properties / person profile fields.
	 */
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

	/**
	 * Clear the bound identity and tear down local state. Call on sign-out: it
	 * clears GA4's `user_id`, resets PostHog, and drops the cached config so a
	 * later {@link init} can boot cleanly.
	 */
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
	 *
	 * @param url - Explicit page URL; defaults to the current location.
	 */
	pageview(url?: string): void {
		if (!this.#config || this.#config.disabled) return;
		this.#posthog?.capture("$pageview", url ? { $current_url: url } : undefined);
		if (this.#config.ga4) {
			gtag("event", "page_view", url ? { page_location: url } : {});
		}
	}
}

/** The process-wide analytics singleton bound by the standalone helpers below. */
export const analytics = new Analytics();

/**
 * Initialise the shared {@link analytics} singleton. Convenience wrapper over
 * {@link Analytics.init}.
 *
 * @param config - PostHog/GA4 credentials plus cross-subdomain and debug flags.
 * @returns A promise that resolves once provider bootstrapping has settled.
 */
export const initAnalytics = (config: AnalyticsConfig): Promise<void> => analytics.init(config);

/**
 * Emit an event through the shared {@link analytics} singleton. Convenience
 * wrapper over {@link Analytics.track}.
 *
 * @template E - The event name, narrowed to a registered key when one exists.
 * @param event - The event name.
 * @param args - The event payload, shaped by {@link TrackArgs}.
 */
export function track<E extends EventName>(event: E, ...args: TrackArgs<E>): void {
	analytics.track(event, ...args);
}

/**
 * Bind an identity on the shared {@link analytics} singleton. Convenience
 * wrapper over {@link Analytics.identify}.
 *
 * @param userId - The stable user identifier.
 * @param traits - Optional user properties / person profile fields.
 */
export const identify = (userId: string, traits?: Record<string, unknown>): void =>
	analytics.identify(userId, traits);

/**
 * Clear identity and state on the shared {@link analytics} singleton.
 * Convenience wrapper over {@link Analytics.reset}.
 */
export const reset = (): void => analytics.reset();

/**
 * Emit a manual pageview through the shared {@link analytics} singleton.
 * Convenience wrapper over {@link Analytics.pageview}.
 *
 * @param url - Explicit page URL; defaults to the current location.
 */
export const pageview = (url?: string): void => analytics.pageview(url);

// ResQ-specific helpers are re-exported here so consumers get one import
// surface: adding a fourth subdomain or tightening the GA4-ID regex is one
// version bump instead of three coordinated edits across the consumer repos.
export {
	GA4_ID_PATTERN,
	isCookieDomain,
	RESQ_SUBDOMAIN_ALLOWLIST,
	resolveResqCookieDomain,
	sanitizeGa4Id,
	toCookieDomain,
} from "./resq";
export type { CookieDomain, Ga4MeasurementId, ResqSubdomain } from "./resq";

/**
 * Derive the shared registrable-root cookie domain from a set of hosts. Returns
 * the longest common dot-suffix in normalized leading-dot {@link CookieDomain}
 * form (e.g. `["research.resq.software", "viz.resq.software"]` →
 * `".resq.software"`), or `undefined` when the hosts share no multi-label root.
 *
 * @param domains - The hosts to reduce to their shared registrable root.
 * @returns The branded shared cookie domain, or `undefined` when there is none.
 */
export const inferCookieDomain = (domains: string[]): CookieDomain | undefined => {
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
	return toCookieDomain(shared) ?? undefined;
};

//#endregion
