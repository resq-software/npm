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
 * @fileoverview Browser-only helpers for `@resq-systems/helpers/browser`.
 *
 * Surfaces:
 * - Platform / browser detection (`isIOS`, `isAndroid`, `getBrowser`,
 *   `getPlatform`, `isTouchScreen`, …)
 * - HTML-entity obfuscation for `mailto:` / `tel:` links
 *   (`obfuscateLink`)
 *
 * All exports rely on `navigator`, `window`, or DOM globals — do not
 * import this subpath into server-side bundles. Use the universal
 * `@resq-systems/helpers` entry for SSR-safe utilities.
 *
 * @module @resq-systems/helpers/browser
 */

export {
	beginDOMCaches,
	closestCrossShadow,
	computeBox,
	elementSafeTagName,
	enclosingElement,
	enclosingShadowRootOrDocument,
	endDOMCaches,
	getElementComputedStyle,
	getGlobalOptions,
	isElementStyleVisibilityVisible,
	isElementVisible,
	isInsideScope,
	isVisibleTextNode,
	parentElementOrShadowHost,
	setGlobalOptions,
} from "./dom-utils.js";
export type { GlobalOptions } from "./dom-utils.js";
export {
	getBrowser,
	getPlatform,
	isAndroid,
	isAndroidChrome,
	isAndroidEdge,
	isAndroidFirefox,
	isAndroidOpera,
	isChrome,
	isChromeOS,
	isEdge,
	isFirefox,
	isIOS,
	isIOSChrome,
	isIOSEdge,
	isIOSFirefox,
	isIOSOpera,
	isIOSSafari,
	isMacOS,
	isMacOSChrome,
	isMacOSEdge,
	isOpera,
	isSafari,
	isTouchScreen,
	isWindows,
	isWindowsChrome,
	isWindowsEdge,
} from "./platform.js";
export type { BrowserName, Platform } from "./platform.js";
export { obfuscateLink } from "./html-entities.js";
export type { HtmlEntityEncoded, ObfuscatedLink } from "./html-entities.js";
export {
	clearLocalStorage,
	clearSessionStorage,
	deleteFromLocalStorage,
	deleteFromSessionStorage,
	getFromLocalStorage,
	getFromSessionStorage,
	setInLocalStorage,
	setInSessionStorage,
} from "./storage.js";
export { fetch, Image } from "./network.js";
export { safeParseUrl } from "./url.js";
export {
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
	DEFAULT_SUPPORTED_MEDIA_TYPES,
	DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES,
	DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES,
	MediaHelpers,
} from "./media/media.js";
