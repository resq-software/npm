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

/**
 * Detects if the current user agent is an iOS device (iPad, iPhone, iPod).
 *
 * @returns {boolean} True if the platform is iOS, otherwise false.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isIOS()) { console.log('Running on iOS'); }
 * ```
 */
export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(globalThis.window as any).MSStream;

/**
 * Detects if the current user agent is an Android device.
 *
 * @returns {boolean} True if the platform is Android, otherwise false.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isAndroid()) { console.log('Running on Android'); }
 * ```
 */
export const isAndroid = (): boolean => /android/i.test(navigator.userAgent);

/**
 * Detects if the current user agent is a macOS device.
 *
 * @returns {boolean} True if the platform is macOS, otherwise false.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isMacOS()) { console.log('Running on macOS'); }
 * ```
 */
export const isMacOS = (): boolean =>
  /Macintosh|Mac|Mac OS|MacIntel|MacPPC|Mac68K/gi.test(navigator.userAgent);

/**
 * Detects if the current user agent is a Windows device.
 *
 * @returns {boolean} True if the platform is Windows, otherwise false.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isWindows()) { console.log('Running on Windows'); }
 * ```
 */
export const isWindows = (): boolean =>
  /Win32|Win64|Windows|Windows NT|WinCE/gi.test(navigator.userAgent);

/**
 * Detects if the current user agent is Chrome OS.
 *
 * @returns {boolean} True if the platform is Chrome OS, otherwise false.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @example
 * ```ts
 * if (isChromeOS()) { console.log('Running on Chrome OS'); }
 * ```
 */
export const isChromeOS = (): boolean => /CrOS/gi.test(navigator.userAgent);

/**
 * Retrieves the browser name based on the user agent string.
 *
 * @returns {string} The browser name: 'edge', 'chrome', 'firefox', 'safari', 'opera', 'android', 'iphone', or 'unknown'.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 * @throws {TypeError} Throws if navigator.userAgent is not accessible.
 * @example
 * ```ts
 * const browser = getBrowser(); // 'chrome', 'firefox', etc.
 * ```
 */
export const getBrowser = (): string => {
  const { userAgent } = navigator;

  if (/edg/i.test(userAgent)) {
    return 'edge';
  }
  if (/chrome|chromium|crios/i.test(userAgent)) {
    return 'chrome';
  }
  if (/firefox|fxios/i.test(userAgent)) {
    return 'firefox';
  }
  if (/safari/i.test(userAgent)) {
    return 'safari';
  }
  if (/opr\//i.test(userAgent)) {
    return 'opera';
  }
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  if (/iphone/i.test(userAgent)) {
    return 'iphone';
  }
  return 'unknown';
};

/**
 * Determines the device platform as a string: 'ios', 'android', 'macos', 'chromeos', 'windows', or 'unknown'.
 *
 * @returns {string} The detected platform.
 * @see isIOS
 * @see isAndroid
 * @see isMacOS
 * @see isChromeOS
 * @see isWindows
 * @example
 * ```ts
 * const platform = getPlatform(); // 'android', 'ios', etc.
 * ```
 */
export const getPlatform = (): string => {
  if (isIOS()) {
    return 'ios';
  }
  if (isAndroid()) {
    return 'android';
  }
  if (isMacOS()) {
    return 'macos';
  }
  if (isChromeOS()) {
    return 'chromeos';
  }
  if (isWindows()) {
    return 'windows';
  }
  return 'unknown';
};

/**
 * Checks if the current device has a touchscreen capability.
 *
 * @returns {boolean} True if touch screen is supported, otherwise false.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/maxTouchPoints
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
 * @example
 * ```ts
 * if (isTouchScreen()) { console.log('Device supports touch.'); }
 * ```
 */
export const isTouchScreen = (): boolean => {
  return (
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    globalThis.window.matchMedia?.('(any-pointer:coarse)').matches
  );
};

/**
 * Determines if the current browser is Google Chrome.
 *
 * @returns {boolean} True if Chrome, otherwise false.
 * @see getBrowser
 */
export const isChrome = (): boolean => getBrowser() === 'chrome';

/**
 * Determines if the current browser is Mozilla Firefox.
 *
 * @returns {boolean} True if Firefox, otherwise false.
 * @see getBrowser
 */
export const isFirefox = (): boolean => getBrowser() === 'firefox';

/**
 * Determines if the current browser is Safari.
 *
 * @returns {boolean} True if Safari, otherwise false.
 * @see getBrowser
 */
export const isSafari = (): boolean => getBrowser() === 'safari';

/**
 * Determines if the current browser is Opera.
 *
 * @returns {boolean} True if Opera, otherwise false.
 * @see getBrowser
 */
export const isOpera = (): boolean => getBrowser() === 'opera';

/**
 * Determines if the current browser is Microsoft Edge.
 *
 * @returns {boolean} True if Edge, otherwise false.
 * @see getBrowser
 */
export const isEdge = (): boolean => getBrowser() === 'edge';

/**
 * Detects Safari running on iOS devices.
 *
 * @returns {boolean} True if iOS Safari, otherwise false.
 * @see isIOS
 * @see isSafari
 */
export const isIOSSafari = (): boolean => getBrowser() === 'safari' && isIOS();

/**
 * Detects Chrome running on iOS devices.
 *
 * @returns {boolean} True if iOS Chrome, otherwise false.
 * @see isIOS
 * @see isChrome
 */
export const isIOSChrome = (): boolean => getBrowser() === 'chrome' && isIOS();

/**
 * Detects Chrome running on Android devices.
 *
 * @returns {boolean} True if Android Chrome, otherwise false.
 * @see isAndroid
 * @see isChrome
 */
export const isAndroidChrome = (): boolean => getBrowser() === 'chrome' && isAndroid();

/**
 * Detects Chrome running on macOS devices.
 *
 * @returns {boolean} True if macOS Chrome, otherwise false.
 * @see isMacOS
 * @see isChrome
 */
export const isMacOSChrome = (): boolean => getBrowser() === 'chrome' && isMacOS();

/**
 * Detects Chrome running on Windows devices.
 *
 * @returns {boolean} True if Windows Chrome, otherwise false.
 * @see isWindows
 * @see isChrome
 */
export const isWindowsChrome = (): boolean => getBrowser() === 'chrome' && isWindows();

/**
 * Detects Firefox running on iOS devices.
 *
 * @returns {boolean} True if iOS Firefox, otherwise false.
 * @see isIOS
 * @see isFirefox
 */
export const isIOSFirefox = (): boolean => getBrowser() === 'firefox' && isIOS();

/**
 * Detects Firefox running on Android devices.
 *
 * @returns {boolean} True if Android Firefox, otherwise false.
 * @see isAndroid
 * @see isFirefox
 */
export const isAndroidFirefox = (): boolean => getBrowser() === 'firefox' && isAndroid();

/**
 * Detects Edge running on iOS devices.
 *
 * @returns {boolean} True if iOS Edge, otherwise false.
 * @see isIOS
 * @see isEdge
 */
export const isIOSEdge = (): boolean => getBrowser() === 'edge' && isIOS();

/**
 * Detects Edge running on Android devices.
 *
 * @returns {boolean} True if Android Edge, otherwise false.
 * @see isAndroid
 * @see isEdge
 */
export const isAndroidEdge = (): boolean => getBrowser() === 'edge' && isAndroid();

/**
 * Detects Edge running on macOS devices.
 *
 * @returns {boolean} True if macOS Edge, otherwise false.
 * @see isMacOS
 * @see isEdge
 */
export const isMacOSEdge = (): boolean => getBrowser() === 'edge' && isMacOS();

/**
 * Detects Edge running on Windows devices.
 *
 * @returns {boolean} True if Windows Edge, otherwise false.
 * @see isWindows
 * @see isEdge
 */
export const isWindowsEdge = (): boolean => getBrowser() === 'edge' && isWindows();

/**
 * Detects Opera running on iOS devices.
 *
 * @returns {boolean} True if iOS Opera, otherwise false.
 * @see isIOS
 * @see isOpera
 */
export const isIOSOpera = (): boolean => getBrowser() === 'opera' && isIOS();

/**
 * Detects Opera running on Android devices.
 *
 * @returns {boolean} True if Android Opera, otherwise false.
 * @see isAndroid
 * @see isOpera
 */
export const isAndroidOpera = (): boolean => getBrowser() === 'opera' && isAndroid();
