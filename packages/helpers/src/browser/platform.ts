/**
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
 */

/**
 * @fileoverview User-agent-based platform and browser detection: platform/OS
 * predicates, a resolved browser/platform name, touch-screen detection, and
 * composed browser-on-platform predicates. Browser-only.
 *
 * @module @resq-systems/helpers/browser/platform
 */

//#region Types

/**
 * Closed set of browser names returned by {@link getBrowser}.
 */
export type BrowserName =
	| "edge"
	| "chrome"
	| "firefox"
	| "safari"
	| "opera"
	| "android"
	| "iphone"
	| "unknown";

/**
 * Closed set of platform names returned by {@link getPlatform}.
 */
export type Platform = "ios" | "android" | "macos" | "chromeos" | "windows" | "unknown";

//#endregion

//#region Platform Detection

/**
 * Detect whether the current user agent is an iOS device (iPad, iPhone, iPod).
 *
 * @returns `true` if the platform is iOS, otherwise `false`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isIOS()) console.log("Running on iOS");
 * ```
 */
export const isIOS = (): boolean =>
	/iPad|iPhone|iPod/.test(navigator.userAgent) && !(globalThis as { MSStream?: unknown }).MSStream;

/**
 * Detect whether the current user agent is an Android device.
 *
 * @returns `true` if the platform is Android, otherwise `false`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isAndroid()) console.log("Running on Android");
 * ```
 */
export const isAndroid = (): boolean => /android/i.test(navigator.userAgent);

/**
 * Detect whether the current user agent is a macOS device.
 *
 * @returns `true` if the platform is macOS, otherwise `false`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isMacOS()) console.log("Running on macOS");
 * ```
 */
export const isMacOS = (): boolean =>
	/Macintosh|Mac|Mac OS|MacIntel|MacPPC|Mac68K/gi.test(navigator.userAgent);

/**
 * Detect whether the current user agent is a Windows device.
 *
 * @returns `true` if the platform is Windows, otherwise `false`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isWindows()) console.log("Running on Windows");
 * ```
 */
export const isWindows = (): boolean =>
	/Win32|Win64|Windows|Windows NT|WinCE/gi.test(navigator.userAgent);

/**
 * Detect whether the current user agent is Chrome OS.
 *
 * @returns `true` if the platform is Chrome OS, otherwise `false`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isChromeOS()) console.log("Running on Chrome OS");
 * ```
 */
export const isChromeOS = (): boolean => /CrOS/gi.test(navigator.userAgent);

//#endregion

//#region Browser & Platform Resolution

/**
 * Resolve the browser name from the user-agent string.
 *
 * @returns The browser name: `"edge"`, `"chrome"`, `"firefox"`, `"safari"`, `"opera"`, `"android"`, `"iphone"`, or `"unknown"`.
 * @throws {TypeError} If `navigator.userAgent` is not accessible.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * const browser = getBrowser(); // → "chrome", "firefox", etc.
 * ```
 */
export const getBrowser = (): BrowserName => {
	const { userAgent } = navigator;

	if (/edg/i.test(userAgent)) {
		return "edge";
	}
	if (/chrome|chromium|crios/i.test(userAgent)) {
		return "chrome";
	}
	if (/firefox|fxios/i.test(userAgent)) {
		return "firefox";
	}
	if (/safari/i.test(userAgent)) {
		return "safari";
	}
	if (/opr\//i.test(userAgent)) {
		return "opera";
	}
	if (/android/i.test(userAgent)) {
		return "android";
	}
	if (/iphone/i.test(userAgent)) {
		return "iphone";
	}
	return "unknown";
};

/**
 * Resolve the device platform: `"ios"`, `"android"`, `"macos"`, `"chromeos"`,
 * `"windows"`, or `"unknown"`.
 *
 * @returns The detected platform.
 * @see {@link isIOS}
 * @see {@link isAndroid}
 * @see {@link isMacOS}
 * @see {@link isChromeOS}
 * @see {@link isWindows}
 * @example
 * ```ts
 * const platform = getPlatform(); // → "android", "ios", etc.
 * ```
 */
export const getPlatform = (): Platform => {
	if (isIOS()) {
		return "ios";
	}
	if (isAndroid()) {
		return "android";
	}
	if (isMacOS()) {
		return "macos";
	}
	if (isChromeOS()) {
		return "chromeos";
	}
	if (isWindows()) {
		return "windows";
	}
	return "unknown";
};

/**
 * Detect whether the current device has touchscreen capability.
 *
 * @returns `true` if a touch screen is supported, otherwise `false`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/maxTouchPoints
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
 * @example
 * ```ts
 * if (isTouchScreen()) console.log("Device supports touch.");
 * ```
 */
export const isTouchScreen = (): boolean => {
	return Boolean(
		(navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
			globalThis.window.matchMedia?.("(any-pointer:coarse)").matches,
	);
};

//#endregion

//#region Browser Predicates

/**
 * Determine whether the current browser is Google Chrome.
 *
 * @returns `true` if Chrome, otherwise `false`.
 * @see {@link getBrowser}
 */
export const isChrome = (): boolean => getBrowser() === "chrome";

/**
 * Determine whether the current browser is Mozilla Firefox.
 *
 * @returns `true` if Firefox, otherwise `false`.
 * @see {@link getBrowser}
 */
export const isFirefox = (): boolean => getBrowser() === "firefox";

/**
 * Determine whether the current browser is Safari.
 *
 * @returns `true` if Safari, otherwise `false`.
 * @see {@link getBrowser}
 */
export const isSafari = (): boolean => getBrowser() === "safari";

/**
 * Determine whether the current browser is Opera.
 *
 * @returns `true` if Opera, otherwise `false`.
 * @see {@link getBrowser}
 */
export const isOpera = (): boolean => getBrowser() === "opera";

/**
 * Determine whether the current browser is Microsoft Edge.
 *
 * @returns `true` if Edge, otherwise `false`.
 * @see {@link getBrowser}
 */
export const isEdge = (): boolean => getBrowser() === "edge";

//#endregion

//#region Browser + Platform Predicates

/**
 * Detect Safari running on iOS devices.
 *
 * @returns `true` if iOS Safari, otherwise `false`.
 * @see {@link isIOS}
 * @see {@link isSafari}
 */
export const isIOSSafari = (): boolean => getBrowser() === "safari" && isIOS();

/**
 * Detect Chrome running on iOS devices.
 *
 * @returns `true` if iOS Chrome, otherwise `false`.
 * @see {@link isIOS}
 * @see {@link isChrome}
 */
export const isIOSChrome = (): boolean => getBrowser() === "chrome" && isIOS();

/**
 * Detect Chrome running on Android devices.
 *
 * @returns `true` if Android Chrome, otherwise `false`.
 * @see {@link isAndroid}
 * @see {@link isChrome}
 */
export const isAndroidChrome = (): boolean => getBrowser() === "chrome" && isAndroid();

/**
 * Detect Chrome running on macOS devices.
 *
 * @returns `true` if macOS Chrome, otherwise `false`.
 * @see {@link isMacOS}
 * @see {@link isChrome}
 */
export const isMacOSChrome = (): boolean => getBrowser() === "chrome" && isMacOS();

/**
 * Detect Chrome running on Windows devices.
 *
 * @returns `true` if Windows Chrome, otherwise `false`.
 * @see {@link isWindows}
 * @see {@link isChrome}
 */
export const isWindowsChrome = (): boolean => getBrowser() === "chrome" && isWindows();

/**
 * Detect Firefox running on iOS devices.
 *
 * @returns `true` if iOS Firefox, otherwise `false`.
 * @see {@link isIOS}
 * @see {@link isFirefox}
 */
export const isIOSFirefox = (): boolean => getBrowser() === "firefox" && isIOS();

/**
 * Detect Firefox running on Android devices.
 *
 * @returns `true` if Android Firefox, otherwise `false`.
 * @see {@link isAndroid}
 * @see {@link isFirefox}
 */
export const isAndroidFirefox = (): boolean => getBrowser() === "firefox" && isAndroid();

/**
 * Detect Edge running on iOS devices.
 *
 * @returns `true` if iOS Edge, otherwise `false`.
 * @see {@link isIOS}
 * @see {@link isEdge}
 */
export const isIOSEdge = (): boolean => getBrowser() === "edge" && isIOS();

/**
 * Detect Edge running on Android devices.
 *
 * @returns `true` if Android Edge, otherwise `false`.
 * @see {@link isAndroid}
 * @see {@link isEdge}
 */
export const isAndroidEdge = (): boolean => getBrowser() === "edge" && isAndroid();

/**
 * Detect Edge running on macOS devices.
 *
 * @returns `true` if macOS Edge, otherwise `false`.
 * @see {@link isMacOS}
 * @see {@link isEdge}
 */
export const isMacOSEdge = (): boolean => getBrowser() === "edge" && isMacOS();

/**
 * Detect Edge running on Windows devices.
 *
 * @returns `true` if Windows Edge, otherwise `false`.
 * @see {@link isWindows}
 * @see {@link isEdge}
 */
export const isWindowsEdge = (): boolean => getBrowser() === "edge" && isWindows();

/**
 * Detect Opera running on iOS devices.
 *
 * @returns `true` if iOS Opera, otherwise `false`.
 * @see {@link isIOS}
 * @see {@link isOpera}
 */
export const isIOSOpera = (): boolean => getBrowser() === "opera" && isIOS();

/**
 * Detect Opera running on Android devices.
 *
 * @returns `true` if Android Opera, otherwise `false`.
 * @see {@link isAndroid}
 * @see {@link isOpera}
 */
export const isAndroidOpera = (): boolean => getBrowser() === "opera" && isAndroid();

//#endregion
