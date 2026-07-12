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
 * @fileoverview React adapter for `@resq-systems/analytics`.
 *
 * Exposes the {@link AnalyticsProvider} component and the
 * {@link useAnalytics} hook. The provider boots the singleton
 * {@link Analytics} instance once on mount; the hook returns the
 * provider-bound functions so consumers don't import the singleton
 * directly.
 *
 * @module @resq-systems/analytics/react
 */

import { type ReactNode, useEffect, useRef } from "react";
import {
	type Analytics,
	type AnalyticsConfig,
	analytics,
	identify,
	pageview,
	reset,
	track,
} from "../index";

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
 * Boot the analytics singleton once on mount and render `children`.
 *
 * Idempotent — repeat mounts (e.g. fast-refresh, tree-rebuild) are
 * detected via a ref guard and do not re-initialise PostHog / GA4.
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
