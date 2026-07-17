/**
 * Copyright 2026 ResQ
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
 */

import { noop } from "../utils/function.js";

/* eslint-disable tldraw/no-direct-storage */

/**
 * Get a value from local storage.
 *
 * @param key - The key to get.
 * @returns The stored value as a string, or null if not found or storage is unavailable.
 * @example
 * ```ts
 * const userTheme = getFromLocalStorage('user-theme')
 * if (userTheme) {
 *   console.log('Stored theme:', userTheme)
 * }
 * ```
 * @internal
 */
export function getFromLocalStorage(key: string) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Set a value in local storage. Will not throw an error if localStorage is not available.
 *
 * @param key - The key to set.
 * @param value - The value to set.
 * @returns void
 * @example
 * ```ts
 * const preferences = { theme: 'dark', language: 'en' }
 * setInLocalStorage('user-preferences', JSON.stringify(preferences))
 * ```
 * @internal
 */
export function setInLocalStorage(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		noop();
	}
}

/**
 * Remove a value from local storage. Will not throw an error if localStorage is not available.
 *
 * @param key - The key to remove.
 * @returns void
 * @example
 * ```ts
 * deleteFromLocalStorage('user-preferences')
 * // Value is now removed from localStorage
 * ```
 * @internal
 */
export function deleteFromLocalStorage(key: string) {
	try {
		localStorage.removeItem(key);
	} catch {
		noop();
	}
}

/**
 * Clear all values from local storage. Will not throw an error if localStorage is not available.
 *
 * @returns void
 * @example
 * ```ts
 * clearLocalStorage()
 * // All localStorage data is now cleared
 * ```
 * @internal
 */
export function clearLocalStorage() {
	try {
		localStorage.clear();
	} catch {
		noop();
	}
}

/**
 * Get a value from session storage.
 *
 * @param key - The key to get.
 * @returns The stored value as a string, or null if not found or storage is unavailable.
 * @example
 * ```ts
 * const currentTool = getFromSessionStorage('current-tool')
 * if (currentTool) {
 *   console.log('Active tool:', currentTool)
 * }
 * ```
 * @internal
 */
export function getFromSessionStorage(key: string) {
	try {
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Set a value in session storage. Will not throw an error if sessionStorage is not available.
 *
 * @param key - The key to set.
 * @param value - The value to set.
 * @returns void
 * @example
 * ```ts
 * setInSessionStorage('current-tool', 'select')
 * setInSessionStorage('temp-data', JSON.stringify({ x: 100, y: 200 }))
 * ```
 * @internal
 */
export function setInSessionStorage(key: string, value: string) {
	try {
		sessionStorage.setItem(key, value);
	} catch {
		noop();
	}
}

/**
 * Remove a value from session storage. Will not throw an error if sessionStorage is not available.
 *
 * @param key - The key to remove.
 * @returns void
 * @example
 * ```ts
 * deleteFromSessionStorage('temp-data')
 * // Value is now removed from sessionStorage
 * ```
 * @internal
 */
export function deleteFromSessionStorage(key: string) {
	try {
		sessionStorage.removeItem(key);
	} catch {
		noop();
	}
}

/**
 * Clear all values from session storage. Will not throw an error if sessionStorage is not available.
 *
 * @returns void
 * @example
 * ```ts
 * clearSessionStorage()
 * // All sessionStorage data is now cleared
 * ```
 * @internal
 */
export function clearSessionStorage() {
	try {
		sessionStorage.clear();
	} catch {
		noop();
	}
}
