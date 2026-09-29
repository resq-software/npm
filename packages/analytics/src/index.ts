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
 * @fileoverview Framework-agnostic core of the unified PostHog + GA4 analytics
 * client: the typed event registry, the lazy-loading {@link Analytics}
 * singleton, and the standalone `track`/`identify`/`reset`/`pageview` helpers.
 *
 * Analytics is opt-in. No provider script, SDK import or tracker request
 * happens until the visitor accepts ({@link grantConsent}); a declined or
 * missing decision keeps every provider unloaded. See `./consent`.
 *
 * @module @resq-systems/analytics
 */

import type { LiteralUnion } from "@resq-systems/types";
import type { PostHog, PostHogConfig } from "posthog-js";
import {
	type ConsentDecision,
	type ConsentState,
	type ConsentStore,
	clearGa4Cookies,
	localStorageConsentStore,
} from "./consent";
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
	/** PostHog project API key (`phc_…`). The only required field. */
	key: string;
	/** Ingestion `api_host`; absence defaults to `https://us.i.posthog.com`. Set for EU or self-hosted regions. */
	host?: string;
	/** PostHog app host for toolbar/session links; absence leaves PostHog's own default. */
	uiHost?: string;
	/** Raw `posthog-js` init options merged *over* the package defaults, so a key set here wins. */
	options?: Partial<PostHogConfig>;
}

/**
 * GA4 provider config. `measurementId` is the branded {@link Ga4MeasurementId}
 * so only a sanitized ID reaches gtag; `domains` seeds the cross-subdomain
 * linker allow-list. Build one ergonomically with `ga4Stream` from
 * `@resq-systems/analytics/next`.
 */
export interface GA4ProviderConfig {
	/** Branded, sanitized GA4 Measurement ID; mint via {@link sanitizeGa4Id}. */
	measurementId: Ga4MeasurementId;
	/** Cross-subdomain linker allow-list for gtag's `linker.domains`; absence or `[]` skips linker setup entirely. */
	domains?: LiteralUnion<ResqSubdomain>[];
	/**
	 * Extra GA4 fields for the stream, sent on every `gtag("config", …)` command
	 * this package issues: at boot, and again with `user_id` from
	 * {@link Analytics.identify} / {@link Analytics.reset}. Merged over the
	 * `linker` built from `domains`, so a key set here wins. Absence sends only
	 * the package-built params.
	 *
	 * @example `{ allow_google_signals: false, allow_ad_personalization_signals: false }`
	 */
	configParams?: GtagConfigParams;
}

/**
 * Top-level analytics configuration passed to {@link Analytics.init}. Both
 * providers are optional so a consumer can run PostHog only, GA4 only, or
 * neither (e.g. `disabled` in preview environments).
 */
export interface AnalyticsConfig {
	/** PostHog provider; omit to run without PostHog. */
	posthog?: PostHogProviderConfig;
	/** GA4 provider; omit to run without GA4. Build one with `ga4Stream`. */
	ga4?: GA4ProviderConfig;
	/**
	 * Cross-subdomain cookie domain in normalized leading-dot form. Typed as the
	 * nominal {@link CookieDomain} so a bare host string is a compile error here:
	 * mint one with {@link toCookieDomain} / {@link inferCookieDomain} or take it
	 * from {@link resolveResqCookieDomain}.
	 */
	cookieDomain?: CookieDomain;
	/**
	 * Kill switch: when `true`, {@link Analytics.init} boots no providers and
	 * every dispatch method becomes a no-op (debug logging still fires). Use for
	 * preview/CI environments.
	 */
	disabled?: boolean;
	/** When `true`, `track`/`identify` log to `console.debug` before dispatch — even while `disabled`. */
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
	/** gtag.js's command queue. It holds `arguments` objects, never plain arrays. */
	dataLayer?: unknown[];
	/** Google's documented per-stream opt-out flag, `ga-disable-<measurement id>`. */
	[optOutFlag: `ga-disable-${string}`]: boolean | undefined;
}

/** Options for constructing an {@link Analytics} instance. */
export interface AnalyticsOptions {
	/** Where the visitor's consent decision is kept. Defaults to `localStorage`. */
	consentStore?: ConsentStore;
}

/** Called with the new state whenever the visitor's consent decision changes. */
export type ConsentListener = (state: ConsentState) => void;

//#endregion

//#region Internal

const isBrowser = (): boolean => typeof window !== "undefined";

/**
 * Google's documented gtag function, `function gtag(){dataLayer.push(arguments);}`.
 * gtag.js runs only commands queued as `arguments` objects and ignores a plain
 * array pushed onto `dataLayer`, so this must push `arguments` itself.
 */
function documentedGtag(..._command: GtagCommand): void {
	const w = window as unknown as GtagWindow;
	w.dataLayer = w.dataLayer ?? [];
	// biome-ignore lint/complexity/noArguments: gtag.js runs only commands queued as `arguments` objects
	w.dataLayer.push(arguments);
}

/**
 * Queue a gtag command. Uses the page's own `window.gtag` when it has one, and
 * otherwise defines it as {@link documentedGtag}, as Google's snippet does.
 */
const gtag = (...args: GtagCommand): void => {
	if (!isBrowser()) return;
	const w = window as unknown as GtagWindow;
	w.dataLayer = w.dataLayer ?? [];
	if (typeof w.gtag !== "function") w.gtag = documentedGtag;
	w.gtag(...args);
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
 * The params every `gtag("config", …)` command for the stream carries: the
 * linker built from `domains`, with the consumer's `configParams` merged over it.
 */
const ga4ConfigParams = (provider: GA4ProviderConfig): GtagConfigParams => ({
	...(provider.domains?.length ? { linker: { domains: provider.domains } } : {}),
	...provider.configParams,
});

/** Set or clear Google's per-stream opt-out flag, which stops gtag.js sending for that stream. */
const setGa4OptOut = (measurementId: string, optedOut: boolean): void => {
	if (!isBrowser()) return;
	(window as unknown as GtagWindow)[`ga-disable-${measurementId}`] = optedOut;
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
 * method is a no-op until then, while `disabled`, and until the visitor has
 * accepted analytics, so call sites never need their own guards.
 *
 * Consent comes first. `init` only records the configuration; the providers
 * boot when the visitor accepts ({@link Analytics.grantConsent}) or when an
 * earlier acceptance is already stored. Before that no script is injected,
 * `posthog-js` is not imported and nothing is sent.
 *
 * PostHog is imported lazily on boot so non-analytics page loads pay nothing,
 * and every event fans out to whichever providers are configured.
 *
 * @example
 * ```ts
 * const a = new Analytics();
 * await a.init({ posthog: { key: "phc_…" } }); // loads nothing yet
 * await a.grantConsent(); // the visitor clicked "Accept"
 * a.track("cta_clicked", { id: "hero" });
 * ```
 */
export class Analytics {
	#config: AnalyticsConfig | null = null;
	#posthog: PostHog | null = null;
	#initPromise: Promise<void> | null = null;
	#bootPromise: Promise<void> | null = null;
	#ga4Started = false;
	#consent: ConsentState | null = null;
	readonly #store: ConsentStore;
	readonly #listeners = new Set<ConsentListener>();

	/** @param options - Where to keep the consent decision; defaults to `localStorage`. */
	constructor(options: AnalyticsOptions = {}) {
		this.#store = options.consentStore ?? localStorageConsentStore;
	}

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
	 * The visitor's consent state: `"granted"`, `"denied"`, or `"unset"` when
	 * they have not chosen yet. Read from the consent store on first access.
	 */
	get consent(): ConsentState {
		this.#consent ??= this.#store.read();
		return this.#consent;
	}

	/**
	 * Record the configuration and, if the visitor has already accepted
	 * analytics, boot the configured providers.
	 *
	 * Idempotent and not cancellable: the first call wins and every later call
	 * returns the *same* cached promise — the second call's `config` is ignored,
	 * so a double-mount never re-inits PostHog / GA4. Concurrent calls are safe
	 * for this reason; there is no `AbortSignal`.
	 *
	 * Without stored consent it only records the config and resolves with no
	 * effects: no script, no SDK import, no request. {@link grantConsent} boots
	 * the providers later.
	 *
	 * Boot effects (browser only, when not `disabled`, after consent):
	 * dynamically imports `posthog-js`, calls `posthog.init`, injects the gtag.js
	 * `<script>` into `document.head`, defines `window.gtag` as Google's snippet
	 * does (unless the page already has one) and queues commands through it onto
	 * `window.dataLayer`, and stores the PostHog client on this instance. On the
	 * server or when `config.disabled` is set it resolves immediately with no
	 * effects.
	 *
	 * @param config - PostHog/GA4 credentials plus cross-subdomain and debug flags.
	 * @returns A promise that resolves once provider bootstrapping (if any) has
	 *   settled. It **rejects** if the `posthog-js` dynamic import fails (e.g. a
	 *   chunk load error) or `posthog.init` throws; because the promise is
	 *   cached, a failed init is never retried — every later call re-returns the
	 *   rejection.
	 */
	init(config: AnalyticsConfig): Promise<void> {
		if (this.#initPromise) return this.#initPromise;
		this.#config = config;
		this.#initPromise = this.consent === "granted" ? this.#boot() : Promise.resolve();
		return this.#initPromise;
	}

	/**
	 * The visitor accepted analytics: store the decision and boot the configured
	 * providers (or re-enable them after an earlier withdrawal on this page).
	 * Before {@link init} it only stores the decision; `init` then boots.
	 *
	 * @returns The boot promise, with the same rejection conditions as {@link init}.
	 */
	grantConsent(): Promise<void> {
		this.#setConsent("granted");
		if (!this.#config) return Promise.resolve();
		if (this.#bootPromise) {
			this.#resume();
			return this.#bootPromise;
		}
		return this.#boot();
	}

	/**
	 * The visitor declined or withdrew consent: store the decision and stop
	 * collection. Providers that never loaded stay unloaded. Providers that did
	 * load are switched off for the rest of the page — PostHog is opted out
	 * (which also clears its stored identifiers) and GA4 is disabled with its
	 * `_ga` cookies deleted.
	 */
	denyConsent(): void {
		this.#setConsent("denied");
		this.#posthog?.opt_out_capturing();
		const ga4 = this.#config?.ga4;
		if (ga4 && this.#ga4Started) {
			gtag("consent", "update", { analytics_storage: "denied" });
			setGa4OptOut(ga4.measurementId, true);
			clearGa4Cookies(this.#config?.cookieDomain);
		}
	}

	/**
	 * Subscribe to consent changes (e.g. to hide a banner once the visitor has
	 * chosen).
	 *
	 * @param listener - Called with the new state after every decision.
	 * @returns A function that removes the listener.
	 */
	onConsentChange(listener: ConsentListener): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	#setConsent(decision: ConsentDecision): void {
		this.#consent = decision;
		this.#store.write(decision);
		for (const listener of this.#listeners) listener(decision);
	}

	#boot(): Promise<void> {
		const config = this.#config;
		if (!config) return Promise.resolve();
		this.#bootPromise ??= this.#bootstrap(config);
		return this.#bootPromise;
	}

	/** Re-enable providers that were loaded, then switched off by {@link denyConsent}. */
	#resume(): void {
		this.#posthog?.opt_in_capturing();
		const ga4 = this.#config?.ga4;
		if (ga4 && this.#ga4Started) {
			setGa4OptOut(ga4.measurementId, false);
			gtag("consent", "update", { analytics_storage: "granted" });
		}
	}

	/** Whether events may be dispatched: initialised, enabled, and consented. */
	#canSend(): boolean {
		return Boolean(this.#config && !this.#config.disabled && this.consent === "granted");
	}

	async #bootstrap(config: AnalyticsConfig): Promise<void> {
		if (config.disabled || !isBrowser()) return;
		if (config.posthog) await this.#initPostHog(config);
		if (this.consent !== "granted") {
			// Declined while `posthog-js` was still loading. Nothing was started,
			// so forget this boot and let a later acceptance run a fresh one.
			this.#bootPromise = null;
			return;
		}
		if (config.ga4) this.#initGa4(config.ga4);
	}

	async #initPostHog(config: AnalyticsConfig): Promise<void> {
		const provider = config.posthog;
		if (!provider) return;
		const mod = await import("posthog-js");
		// Declined during the import: never initialise, so nothing is captured.
		if (this.consent !== "granted") return;
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
		// Runs only after the visitor accepted analytics. That consent covers
		// measurement, not advertising, so Consent Mode keeps the ad signals off.
		gtag("consent", "default", {
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
			analytics_storage: "granted",
		});
		setGa4OptOut(provider.measurementId, false);
		this.#ga4Started = true;
		loadGa4Script(provider.measurementId);
		gtag("js", new Date());
		gtag("config", provider.measurementId, ga4ConfigParams(provider));
	}

	/**
	 * Emit an event to every configured provider. Registered events (via
	 * {@link AnalyticsEvents} augmentation) get a typed, sometimes-required
	 * payload; ad-hoc names accept an optional free-form bag. GA4 params are
	 * flattened to primitives by {@link primitivesOnly} before dispatch.
	 *
	 * Effectful, never throws: a no-op before {@link init}, while `disabled` and
	 * without the visitor's consent (a `debug` log still fires first). Otherwise
	 * forwards to `posthog.capture` and pushes a gtag `event` command onto
	 * `window.dataLayer`.
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
		if (!this.#canSend()) return;
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
	 * Effectful, never throws: a no-op before {@link init}, while `disabled` and
	 * without the visitor's consent (a `debug` log still fires first). Otherwise
	 * calls `posthog.identify` and emits gtag `set`/`config` commands on
	 * `window.dataLayer`.
	 *
	 * @param userId - The stable user identifier.
	 * @param traits - Optional user properties / person profile fields.
	 */
	identify(userId: string, traits?: Record<string, unknown>): void {
		if (!this.#config) return;
		if (this.#config.debug) {
			console.debug("[analytics] identify", userId, traits);
		}
		if (!this.#canSend()) return;
		this.#posthog?.identify(userId, traits);
		const ga4 = this.#config.ga4;
		if (ga4) {
			gtag("set", "user_properties", primitivesOnly(traits));
			gtag("config", ga4.measurementId, { ...ga4ConfigParams(ga4), user_id: userId });
		}
	}

	/**
	 * Clear the bound identity and tear down local state. Call on sign-out: it
	 * clears GA4's `user_id`, resets PostHog, and drops the cached config so a
	 * later {@link init} can boot cleanly.
	 *
	 * Effectful, never throws, and idempotent: it runs regardless of the
	 * `disabled` flag, and mutates instance state (`config`, `posthog`, and the
	 * cached init and boot promises all reset to `null`). Calling it on an
	 * uninitialised instance is a harmless no-op. The visitor's consent decision
	 * is kept: signing out is not a privacy choice.
	 */
	reset(): void {
		const ga4 = this.#config?.ga4;
		if (ga4 && this.#ga4Started) {
			gtag("config", ga4.measurementId, { ...ga4ConfigParams(ga4), user_id: null });
		}
		this.#posthog?.reset();
		this.#config = null;
		this.#posthog = null;
		this.#initPromise = null;
		this.#bootPromise = null;
		this.#ga4Started = false;
	}

	/**
	 * Manually emit a pageview. Most consumers do **not** need to call this:
	 * PostHog's `capture_pageview: "history_change"` (set in init) auto-captures
	 * SPA navigation, and GA4's Enhanced Measurement (UI default) does the same
	 * for gtag.js. Only call manually if you've disabled both auto-captures, or
	 * for first-paint pageviews before init has resolved.
	 *
	 * Effectful, never throws: a no-op before {@link init}, while `disabled` and
	 * without the visitor's consent (no `debug` log here, unlike
	 * `track`/`identify`). Otherwise emits a PostHog `$pageview` and a gtag
	 * `page_view` event.
	 *
	 * @param url - Explicit page URL; defaults to the current location.
	 */
	pageview(url?: string): void {
		if (!this.#canSend()) return;
		this.#posthog?.capture("$pageview", url ? { $current_url: url } : undefined);
		if (this.#config?.ga4) {
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
 * @returns A promise that resolves once provider bootstrapping has settled, and
 *   rejects on the same conditions as {@link Analytics.init} (failed `posthog-js`
 *   import or `posthog.init` throw).
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

/**
 * The visitor accepted analytics. Convenience wrapper over
 * {@link Analytics.grantConsent} on the shared {@link analytics} singleton.
 *
 * @returns The provider boot promise.
 */
export const grantConsent = (): Promise<void> => analytics.grantConsent();

/**
 * The visitor declined or withdrew analytics. Convenience wrapper over
 * {@link Analytics.denyConsent} on the shared {@link analytics} singleton.
 */
export const denyConsent = (): void => analytics.denyConsent();

/**
 * The visitor's current consent state on the shared {@link analytics} singleton.
 *
 * @returns `"granted"`, `"denied"`, or `"unset"` before the visitor has chosen.
 */
export const getConsent = (): ConsentState => analytics.consent;

/**
 * Subscribe to consent changes on the shared {@link analytics} singleton.
 *
 * @param listener - Called with the new state after every decision.
 * @returns A function that removes the listener.
 */
export const onConsentChange = (listener: ConsentListener): (() => void) =>
	analytics.onConsentChange(listener);

export {
	CONSENT_STORAGE_KEY,
	type ConsentDecision,
	type ConsentState,
	type ConsentStore,
	localStorageConsentStore,
} from "./consent";

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
 * Pure and total: never throws. An empty input list, or hosts whose only common
 * suffix is a single label, yields the `undefined` sentinel.
 *
 * @param domains - The hosts to reduce to their shared registrable root.
 * @returns The branded shared {@link CookieDomain}, or the `undefined` sentinel
 *   when there is no shared multi-label root.
 * @example
 * ```ts
 * inferCookieDomain(["research.resq.software", "viz.resq.software"]);
 * // → branded ".resq.software"
 * inferCookieDomain(["a.example.com", "b.other.org"]); // → undefined
 * ```
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
