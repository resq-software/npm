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
 * @fileoverview React adapter for `@resq-systems/analytics`.
 *
 * Exposes the {@link AnalyticsProvider} component and the
 * {@link useAnalytics} hook. The provider boots the singleton
 * {@link Analytics} instance once on mount; the hook returns the
 * provider-bound functions so consumers don't import the singleton
 * directly.
 *
 * Consent is headless here: {@link useConsent} exposes the visitor's decision
 * and {@link useConsentBanner} tells the app when to show its Accept/Decline
 * banner, and {@link openPrivacySettings} reopens it. The app owns the markup,
 * so the banner matches its design system. Nothing loads until the visitor
 * accepts.
 *
 * @module @resq-systems/analytics/react
 */

import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import {
	type Analytics,
	type AnalyticsConfig,
	analytics,
	type ConsentState,
	identify,
	pageview,
	reset,
	track,
} from "../index";

//#region Provider

/**
 * Props for {@link AnalyticsProvider}.
 */
export interface AnalyticsProviderProps {
	/**
	 * Provider configuration — PostHog/GA4 credentials,
	 * cross-subdomain cookie domain, debug flag, etc. Read once on
	 * mount; later prop changes do **not** re-initialise the
	 * singleton (use {@link reset} + a remount if you need that).
	 */
	config: AnalyticsConfig;
	/**
	 * Wait for `requestIdleCallback` before booting analytics so it
	 * never sits on the LCP critical path. Defaults to `true`. Set
	 * to `false` only when you need first-paint events captured.
	 */
	deferUntilIdle?: boolean;
	/** Wrapped tree. */
	children?: ReactNode;
}

/**
 * Cross-runtime `requestIdleCallback` shim. Falls back to a 1ms
 * `setTimeout` in browsers that lack the API (Safari ≤ 16) and is a
 * no-op on the server.
 *
 * @internal
 */
const requestIdle = (cb: () => void): void => {
	if (typeof window === "undefined") return;
	const w = window as unknown as {
		requestIdleCallback?: (cb: () => void) => number;
	};
	if (typeof w.requestIdleCallback === "function") {
		w.requestIdleCallback(cb);
	} else {
		setTimeout(cb, 1);
	}
};

/**
 * Record the analytics config once on mount and render `children`. Providers
 * boot only once the visitor has accepted analytics — either earlier (a stored
 * decision) or later through {@link useConsent} / {@link useConsentBanner}.
 *
 * Idempotent — repeat mounts (e.g. fast-refresh, tree-rebuild) are
 * detected via a ref guard and do not re-initialise PostHog / GA4.
 *
 * The boot is fire-and-forget: the init promise is not awaited, so a rejected
 * init (see {@link Analytics.init}) surfaces as an unhandled rejection rather
 * than an error thrown from render. Toggling `deferUntilIdle` after mount has no
 * effect — init runs at most once.
 *
 * @example Default (idle-deferred boot)
 * ```tsx
 * <AnalyticsProvider config={config}>
 *   <App />
 * </AnalyticsProvider>
 * ```
 *
 * @example Eager boot for first-paint events
 * ```tsx
 * <AnalyticsProvider config={config} deferUntilIdle={false}>
 *   <App />
 * </AnalyticsProvider>
 * ```
 */
export const AnalyticsProvider = ({
	config,
	deferUntilIdle = true,
	children,
}: AnalyticsProviderProps): ReactNode => {
	const configRef = useRef(config);
	configRef.current = config;
	const initStarted = useRef(false);

	useEffect(() => {
		if (initStarted.current) return;
		initStarted.current = true;
		const start = (): void => {
			void analytics.init(configRef.current);
		};
		if (deferUntilIdle) {
			requestIdle(start);
		} else {
			start();
		}
	}, [deferUntilIdle]);

	return children;
};

//#endregion

//#region Consent

/** Return type of {@link useConsent}. */
export interface UseConsentReturn {
	/** The visitor's decision, or `"unset"` before they choose (and during SSR). */
	consent: ConsentState;
	/** The visitor accepted: store it and boot the configured providers. */
	accept: () => void;
	/** The visitor declined or withdrew: store it and switch analytics off. */
	decline: () => void;
}

const subscribeConsent = (onChange: () => void): (() => void) =>
	analytics.onConsentChange(onChange);
const readConsent = (): ConsentState => analytics.consent;
// The server cannot see the visitor's stored choice.
const readServerConsent = (): ConsentState => "unset";

/**
 * The visitor's analytics consent, kept in sync with the singleton.
 *
 * @example
 * ```tsx
 * const { consent, decline } = useConsent();
 * if (consent === "granted") return <button onClick={decline}>Stop analytics</button>;
 * ```
 */
export const useConsent = (): UseConsentReturn => {
	const consent = useSyncExternalStore(subscribeConsent, readConsent, readServerConsent);
	const accept = useCallback((): void => {
		void analytics.grantConsent();
	}, []);
	const decline = useCallback((): void => {
		analytics.denyConsent();
	}, []);
	return { consent, accept, decline };
};

let settingsOpen = false;
const settingsListeners = new Set<() => void>();
const setSettingsOpen = (open: boolean): void => {
	settingsOpen = open;
	for (const listener of settingsListeners) listener();
};
const subscribeSettings = (onChange: () => void): (() => void) => {
	settingsListeners.add(onChange);
	return () => {
		settingsListeners.delete(onChange);
	};
};
const readSettings = (): boolean => settingsOpen;
const readServerSettings = (): boolean => false;

/**
 * Reopen the consent banner so the visitor can change their choice. Wire it to
 * a visible "Privacy settings" link or button.
 */
export const openPrivacySettings = (): void => setSettingsOpen(true);

/** Return type of {@link useConsentBanner}. */
export interface UseConsentBannerReturn extends UseConsentReturn {
	/**
	 * Whether to render the banner: the visitor has not chosen yet, or asked to
	 * change their choice via {@link openPrivacySettings}. Always `false` during
	 * server rendering and the first client render, so hydration matches.
	 */
	open: boolean;
	/** Hide a reopened banner without changing the stored choice. */
	close: () => void;
}

/**
 * Headless state for an Accept/Decline consent banner. Render the banner when
 * `open` is true, give Accept and Decline equal prominence, and link the
 * site's privacy notice from it. Choosing either option closes it.
 *
 * @example
 * ```tsx
 * const { open, accept, decline } = useConsentBanner();
 * if (!open) return null;
 * return (
 *   <section aria-label="Analytics consent">
 *     <p>May we use analytics? <a href="/privacy">Privacy notice</a></p>
 *     <button onClick={decline}>Decline</button>
 *     <button onClick={accept}>Accept</button>
 *   </section>
 * );
 * ```
 */
export const useConsentBanner = (): UseConsentBannerReturn => {
	const { consent, accept, decline } = useConsent();
	const reopened = useSyncExternalStore(subscribeSettings, readSettings, readServerSettings);
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	const close = useCallback((): void => setSettingsOpen(false), []);
	const acceptAndClose = useCallback((): void => {
		accept();
		setSettingsOpen(false);
	}, [accept]);
	const declineAndClose = useCallback((): void => {
		decline();
		setSettingsOpen(false);
	}, [decline]);
	return {
		consent,
		open: hydrated && (consent === "unset" || reopened),
		accept: acceptAndClose,
		decline: declineAndClose,
		close,
	};
};

//#endregion

//#region Hook

/**
 * Return type of {@link useAnalytics}.
 *
 * Bundles the public method surface of the singleton plus a direct
 * reference to it for advanced callers (e.g. component-level
 * `groupIdentify`, `featureFlags`).
 */
export interface UseAnalyticsReturn {
	/** Type-safe `track(event, props)` — extend `AnalyticsEvents` for typed events. */
	track: Analytics["track"];
	/** Bind an identity to the current session. Use on sign-in. */
	identify: typeof identify;
	/** Clear identity + provider state. Use on sign-out. */
	reset: typeof reset;
	/** Manually emit a pageview (rarely needed — auto-capture is on by default). */
	pageview: typeof pageview;
	/** Direct singleton reference for advanced PostHog/GA4 features not on this surface. */
	analytics: Analytics;
}

/**
 * Component-level access to the analytics surface.
 *
 * Does **not** subscribe to React state — calls to `track` are pure
 * side effects, so the hook is safe to call once per component
 * without causing re-renders.
 *
 * @example
 * ```tsx
 * const { track } = useAnalytics();
 * <button onClick={() => track("cta_clicked", { id: "hero" })}>Click</button>
 * ```
 */
export const useAnalytics = (): UseAnalyticsReturn => ({
	track,
	identify,
	reset,
	pageview,
	analytics,
});

//#endregion
