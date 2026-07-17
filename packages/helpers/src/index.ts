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
 * @fileoverview Public API for `@resq-systems/helpers` — functional utilities,
 * type guards, Result types, code-path parsing, async task execution, and
 * formatting helpers.
 *
 * Subpath exports keep server-only and browser-only code separate:
 * - `@resq-systems/helpers` — universal utilities (Result, type guards, task exec)
 * - `@resq-systems/helpers/formatting` — date / number / string formatters
 * - `@resq-systems/helpers/browser` — DOM helpers, platform detection, html entities
 *
 * @module @resq-systems/helpers
 *
 * @example Result type
 * ```ts
 * import { catchError } from "@resq-systems/helpers";
 *
 * const result = await catchError(fetch, "/api/data");
 * if (result.success) console.log(result.value);
 * else console.error(result.error);
 * ```
 *
 * @example Type guards
 * ```ts
 * import { isString, isObject } from "@resq-systems/helpers";
 *
 * if (isString(input)) input.toUpperCase();
 * if (isObject(input)) Object.keys(input);
 * ```
 */

export {
	bindResult,
	catchError,
	failure,
	getURL,
	isFunction,
	isNumber,
	isPromise,
	isString,
	map,
	railway,
	recover,
	Stringify,
	success,
	tap,
} from "./helpers.js";
export { parseCodePath, parseCodePathDetailed } from "./parse-code-path.js";
export { TaskExec } from "./task-exec.js";
export type * from "./task-exec.types.js";
export {
	capitalize,
	formatBytes,
	formatDate,
	formatDateOnly,
	formatDatePeriod,
	formatDateTime,
	formatMonthYear,
	formatNumber,
	formatPercent,
	formatRelativeTime,
	slugify,
	truncate,
} from "./formatting/index.js";
export type { DateFormatOptions } from "./formatting/index.js";
export {
	beginDOMCaches,
	clearLocalStorage,
	clearSessionStorage,
	closestCrossShadow,
	computeBox,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
	DEFAULT_SUPPORTED_MEDIA_TYPES,
	DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES,
	DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES,
	deleteFromLocalStorage,
	deleteFromSessionStorage,
	elementSafeTagName,
	enclosingElement,
	enclosingShadowRootOrDocument,
	endDOMCaches,
	fetch,
	getBrowser,
	getElementComputedStyle,
	getFromLocalStorage,
	getFromSessionStorage,
	getGlobalOptions,
	getPlatform,
	Image,
	isAndroid,
	isAndroidChrome,
	isAndroidEdge,
	isAndroidFirefox,
	isAndroidOpera,
	isChrome,
	isChromeOS,
	isEdge,
	isElementStyleVisibilityVisible,
	isElementVisible,
	isFirefox,
	isInsideScope,
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
	isVisibleTextNode,
	isWindows,
	isWindowsChrome,
	isWindowsEdge,
	MediaHelpers,
	obfuscateLink,
	parentElementOrShadowHost,
	safeParseUrl,
	setGlobalOptions,
	setInLocalStorage,
	setInSessionStorage,
} from "./browser/index.js";
export type {
	BrowserName,
	GlobalOptions,
	HtmlEntityEncoded,
	ObfuscatedLink,
	Platform,
} from "./browser/index.js";

// Universal Vendored Utilities
export {
	areArraysShallowEqual,
	compact,
	dedupe,
	last,
	maxBy,
	mergeArraysAndReplaceDefaults,
	minBy,
	partition,
	rotateArray,
} from "./utils/array.js";
export {
	areObjectsShallowEqual,
	filterEntries,
	getChangedKeys,
	getOwnProperty,
	groupBy,
	hasOwnProperty,
	isEqualAllowingForFloatingPointErrors,
	mapObjectMapValues,
	objectMapEntries,
	objectMapEntriesIterable,
	objectMapFromEntries,
	objectMapKeys,
	objectMapValues,
	omit,
} from "./utils/object.js";
export {
	assert,
	assertExists,
	exhaustiveSwitchError,
	promiseWithResolve,
	Result,
	sleep,
} from "./utils/control.js";
export type { ErrorResult, OkResult } from "./utils/control.js";
export { debounce } from "./utils/debounce.js";
export { FpsScheduler, fpsThrottle, throttleToNextFrame } from "./utils/throttle.js";
export { FileHelpers } from "./utils/file.js";
export { noop, omitFromStackTrace } from "./utils/function.js";
export { mockUniqueId, restoreUniqueId, uniqueId } from "./utils/id.js";
export { getFirstFromIterable } from "./utils/iterable.js";
export {
	measureAverageDuration,
	measureCbDuration,
	measureDuration,
	PERFORMANCE_COLORS,
	PERFORMANCE_PREFIX_COLOR,
} from "./utils/perf.js";
export { PerformanceTracker } from "./utils/performance-tracker.js";
export { retry } from "./utils/retry.js";
export { sortById } from "./utils/sort.js";
export {
	escapeHTML,
	escapeHTMLAttribute,
	escapeRegExp,
	escapeTemplateString,
	escapeWithQuotes,
	normalizeWhiteSpace,
	toSnakeCase,
	toTitleCase,
	trimString,
	trimStringWithEllipsis,
	truncateDataUrl,
} from "./utils/string-utils.js";
export { Timers } from "./utils/timers.js";
export {
	isDefined,
	isNativeStructuredClone,
	isNonNull,
	isNonNullish,
	structuredClone,
	STRUCTURED_CLONE_OBJECT_PROTOTYPE,
} from "./utils/value.js";
export { warnDeprecatedGetter, warnOnce } from "./utils/warn.js";
export { ExecutionQueue } from "./utils/execution-queue.js";
export { ManualPromise, signalToPromise } from "./utils/manual-promise.js";
export { Semaphore } from "./utils/semaphore.js";
