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

/*!
 * Adapted from Microsoft Playwright — packages/injected/src/domUtils.ts
 * https://github.com/microsoft/playwright
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * @file DOM element utilities: shadow-DOM-aware traversal, visibility checks,
 *       cached computed styles, and box computation. Browser-only.
 * @module @resq-systems/helpers/browser/dom-utils
 */

/** Options that tweak DOM heuristics for specific browser quirks. */
export type GlobalOptions = {
	browserNameForWorkarounds?: string;
};

let globalOptions: GlobalOptions = {};

/** Set global DOM-utility options (e.g. the browser name for workarounds). */
export function setGlobalOptions(options: GlobalOptions): void {
	globalOptions = options;
}

/** Read the current global DOM-utility options. */
export function getGlobalOptions(): GlobalOptions {
	return globalOptions;
}

/**
 * Whether `element` is contained within `scope`, crossing shadow boundaries.
 */
export function isInsideScope(scope: Node, element: Element | undefined): boolean {
	let current = element;
	while (current) {
		if (scope.contains(current)) return true;
		current = enclosingShadowHost(current);
	}
	return false;
}

/** The nearest enclosing `Element` for any node (itself if already an element). */
export function enclosingElement(node: Node): Element | undefined {
	if (node.nodeType === 1 /* Node.ELEMENT_NODE */) return node as Element;
	return node.parentElement ?? undefined;
}

/**
 * The parent element, or the shadow host when `element` is a shadow root's
 * top-level child.
 */
export function parentElementOrShadowHost(element: Element): Element | undefined {
	if (element.parentElement) return element.parentElement;
	if (!element.parentNode) return undefined;
	if (
		element.parentNode.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */ &&
		(element.parentNode as ShadowRoot).host
	) {
		return (element.parentNode as ShadowRoot).host;
	}
	return undefined;
}

/** The enclosing `ShadowRoot` or `Document` for an element. */
export function enclosingShadowRootOrDocument(element: Element): Document | ShadowRoot | undefined {
	let node: Node = element;
	while (node.parentNode) node = node.parentNode;
	if (
		node.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */ ||
		node.nodeType === 9 /* Node.DOCUMENT_NODE */
	) {
		return node as Document | ShadowRoot;
	}
	return undefined;
}

function enclosingShadowHost(element: Element): Element | undefined {
	let current = element;
	while (current.parentElement) current = current.parentElement;
	return parentElementOrShadowHost(current);
}

/**
 * Like `Element.closest`, but crosses shadow boundaries. If `scope` is
 * provided, `element` is assumed to be inside `scope`'s subtree.
 */
export function closestCrossShadow(
	element: Element | undefined,
	css: string,
	scope?: Document | Element,
): Element | undefined {
	let current = element;
	while (current) {
		const closest = current.closest(css);
		if (scope && closest !== scope && closest?.contains(scope)) return undefined;
		if (closest) return closest;
		current = enclosingShadowHost(current);
	}
	return undefined;
}

/** Cached `getComputedStyle`, optionally for the `::before`/`::after` pseudo. */
export function getElementComputedStyle(
	element: Element,
	pseudo?: string,
): CSSStyleDeclaration | undefined {
	const cache =
		pseudo === "::before" ? cacheStyleBefore : pseudo === "::after" ? cacheStyleAfter : cacheStyle;
	if (cache?.has(element)) return cache.get(element);
	const style = element.ownerDocument?.defaultView?.getComputedStyle(element, pseudo) ?? undefined;
	cache?.set(element, style);
	return style;
}

/** Whether the element is visible per `visibility`/`content-visibility` style. */
export function isElementStyleVisibilityVisible(
	element: Element,
	style?: CSSStyleDeclaration,
): boolean {
	const computed = style ?? getElementComputedStyle(element);
	if (!computed) return true;
	// Element.checkVisibility checks for content-visibility and also looks at
	// styles up the flat tree including user-agent ShadowRoots (e.g. details).
	// All browsers implement it, but WebKit has a bug that prevents use:
	// https://bugs.webkit.org/show_bug.cgi?id=264733
	if (
		typeof Element.prototype.checkVisibility === "function" &&
		globalOptions.browserNameForWorkarounds !== "webkit"
	) {
		if (!element.checkVisibility()) return false;
	} else {
		// Manual workaround for WebKit that does not have checkVisibility.
		const detailsOrSummary = element.closest("details,summary");
		if (
			detailsOrSummary !== element &&
			detailsOrSummary?.nodeName === "DETAILS" &&
			!(detailsOrSummary as HTMLDetailsElement).open
		) {
			return false;
		}
	}
	if (computed.visibility !== "visible") return false;
	return true;
}

/** Visibility + inline-ness + cursor of an element, honoring `display:contents`. */
export function computeBox(element: Element): {
	visible: boolean;
	inline: boolean;
	cursor?: string;
} {
	// Note: this logic should mirror waitForDisplayedAtStablePosition() to avoid surprises.
	const style = getElementComputedStyle(element);
	if (!style) return { visible: true, inline: false };
	const cursor = style.cursor;
	if (style.display === "contents") {
		// display:contents is not rendered itself, but its child nodes are.
		for (let child = element.firstChild; child; child = child.nextSibling) {
			if (child.nodeType === 1 /* Node.ELEMENT_NODE */ && isElementVisible(child as Element)) {
				return { visible: true, inline: false, cursor };
			}
			if (child.nodeType === 3 /* Node.TEXT_NODE */ && isVisibleTextNode(child as Text)) {
				return { visible: true, inline: true, cursor };
			}
		}
		return { visible: false, inline: false, cursor };
	}
	if (!isElementStyleVisibilityVisible(element, style)) {
		return { cursor, visible: false, inline: false };
	}
	const rect = element.getBoundingClientRect();
	return { cursor, visible: rect.width > 0 && rect.height > 0, inline: style.display === "inline" };
}

/** Whether an element is visible (rendered with a non-zero box). */
export function isElementVisible(element: Element): boolean {
	return computeBox(element).visible;
}

/** Whether a text node renders a non-zero box. */
export function isVisibleTextNode(node: Text): boolean {
	// https://stackoverflow.com/questions/1461059/is-there-an-equivalent-to-getboundingclientrect-for-text-nodes
	const range = node.ownerDocument.createRange();
	range.selectNode(node);
	const rect = range.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
}

/**
 * The element's tag name in upper case, resilient to named form fields that
 * shadow `tagName` (e.g. `<input name="tagName">`).
 */
export function elementSafeTagName(element: Element): string {
	const tagName = element.tagName;
	// Fast path.
	if (typeof tagName === "string") return tagName.toUpperCase();
	// Named inputs (e.g. <input name=tagName>) are exposed as fields on the
	// parent <form> and can override its properties.
	if (element instanceof HTMLFormElement) return "FORM";
	// Fallback: `nodeName` is always the string tag name and cannot be shadowed
	// on a non-form element.
	return element.nodeName.toUpperCase();
}

let cacheStyle: WeakMap<Element, CSSStyleDeclaration | undefined> | undefined;
let cacheStyleBefore: WeakMap<Element, CSSStyleDeclaration | undefined> | undefined;
let cacheStyleAfter: WeakMap<Element, CSSStyleDeclaration | undefined> | undefined;
let cachesCounter = 0;

/**
 * Begin a computed-style caching scope. Nestable — pair with {@link endDOMCaches}.
 * While active, {@link getElementComputedStyle} memoizes results per element.
 */
export function beginDOMCaches(): void {
	++cachesCounter;
	cacheStyle ??= new WeakMap();
	cacheStyleBefore ??= new WeakMap();
	cacheStyleAfter ??= new WeakMap();
}

/** End a computed-style caching scope opened with {@link beginDOMCaches}. */
export function endDOMCaches(): void {
	if (!--cachesCounter) {
		cacheStyle = undefined;
		cacheStyleBefore = undefined;
		cacheStyleAfter = undefined;
	}
}
