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
 * @fileoverview The visitor's analytics consent: its states, where the choice
 * is stored, and how a stored value is read back.
 *
 * Analytics is opt-in. Until the visitor accepts, {@link Analytics.init} loads
 * no provider script, imports no SDK and sends nothing. The choice is kept in
 * `localStorage` under {@link CONSENT_STORAGE_KEY} so it survives reloads; when
 * storage is unavailable (private mode, blocked site data) it holds for the
 * current page only and the visitor is asked again next time.
 *
 * @module @resq-systems/analytics/consent
 */

/** A decision the visitor has made. */
export type ConsentDecision = "granted" | "denied";

/**
 * The visitor's consent state. `"unset"` means no decision yet, which is
 * treated exactly like `"denied"`: nothing loads.
 */
export type ConsentState = ConsentDecision | "unset";

/**
 * `localStorage` key holding the visitor's decision. Shared by every site that
 * uses this package, so a site that stores the choice itself should use the
 * same key and values (`"granted"` / `"denied"`).
 */
export const CONSENT_STORAGE_KEY = "resq-analytics-consent";

/**
 * Where the decision is persisted. The default is {@link localStorageConsentStore};
 * pass another to {@link Analytics} to keep the choice somewhere else (a
 * server-side preference, a consent-management platform).
 */
export interface ConsentStore {
	/** The stored state, or `"unset"` when nothing valid is stored. Must not throw. */
	read(): ConsentState;
	/** Persist a decision. Must not throw. */
	write(decision: ConsentDecision): void;
}

const isDecision = (value: unknown): value is ConsentDecision =>
	value === "granted" || value === "denied";

const storage = (): Storage | null => {
	try {
		return typeof window === "undefined" ? null : (window.localStorage ?? null);
	} catch {
		// Accessing `localStorage` throws a SecurityError when site data is blocked.
		return null;
	}
};

/**
 * The default {@link ConsentStore}: `localStorage` under {@link CONSENT_STORAGE_KEY}.
 * Reads and writes never throw; with no usable storage it reads `"unset"` and
 * drops writes.
 */
export const localStorageConsentStore: ConsentStore = {
	read(): ConsentState {
		try {
			const value = storage()?.getItem(CONSENT_STORAGE_KEY);
			return isDecision(value) ? value : "unset";
		} catch {
			return "unset";
		}
	},
	write(decision: ConsentDecision): void {
		try {
			storage()?.setItem(CONSENT_STORAGE_KEY, decision);
		} catch {
			// Quota or policy errors: the decision still holds in memory for this page.
		}
	},
};

/**
 * Delete Google Analytics' first-party cookies (`_ga`, `_ga_<stream>`), on the
 * current host and, when given, on the shared cookie domain. Used when a
 * visitor withdraws consent. A no-op outside the browser.
 *
 * @param cookieDomain - The cross-subdomain domain the cookies were set on, if any.
 */
export const clearGa4Cookies = (cookieDomain?: string): void => {
	if (typeof document === "undefined" || typeof document.cookie !== "string") return;
	const names = document.cookie
		.split(";")
		.map((part) => part.split("=")[0]?.trim() ?? "")
		.filter((name) => name === "_ga" || name.startsWith("_ga_"));
	for (const name of names) {
		const expired = `${name}=; Max-Age=0; path=/`;
		document.cookie = expired;
		if (cookieDomain) document.cookie = `${expired}; domain=${cookieDomain}`;
	}
};
