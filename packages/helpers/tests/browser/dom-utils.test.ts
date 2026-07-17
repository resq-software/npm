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

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
	beginDOMCaches,
	closestCrossShadow,
	elementSafeTagName,
	enclosingElement,
	enclosingShadowRootOrDocument,
	endDOMCaches,
	getElementComputedStyle,
	getGlobalOptions,
	isElementStyleVisibilityVisible,
	isInsideScope,
	parentElementOrShadowHost,
	setGlobalOptions,
} from "../../src/browser/dom-utils.js";

afterEach(() => {
	document.body.innerHTML = "";
	setGlobalOptions({});
});

describe("global options", () => {
	it("round-trips set/get", () => {
		setGlobalOptions({ browserNameForWorkarounds: "webkit" });
		expect(getGlobalOptions().browserNameForWorkarounds).toBe("webkit");
	});
});

describe("traversal", () => {
	it("enclosingElement returns the element itself or the parent element", () => {
		const div = document.createElement("div");
		div.textContent = "hi";
		const text = div.firstChild as Text;
		expect(enclosingElement(div)).toBe(div);
		expect(enclosingElement(text)).toBe(div);
	});

	it("parentElementOrShadowHost crosses the shadow boundary", () => {
		const host = document.createElement("div");
		document.body.appendChild(host);
		const root = host.attachShadow({ mode: "open" });
		const inner = document.createElement("span");
		root.appendChild(inner);
		expect(parentElementOrShadowHost(inner)).toBe(host);
	});

	it("enclosingShadowRootOrDocument returns the document, then the shadow root", () => {
		const el = document.createElement("div");
		document.body.appendChild(el);
		expect(enclosingShadowRootOrDocument(el)).toBe(document);

		const host = document.createElement("div");
		document.body.appendChild(host);
		const root = host.attachShadow({ mode: "open" });
		const inner = document.createElement("span");
		root.appendChild(inner);
		expect(enclosingShadowRootOrDocument(inner)).toBe(root);
	});

	it("isInsideScope respects containment across shadow hosts", () => {
		const host = document.createElement("section");
		document.body.appendChild(host);
		const root = host.attachShadow({ mode: "open" });
		const inner = document.createElement("span");
		root.appendChild(inner);
		expect(isInsideScope(host, inner)).toBe(true);
		expect(isInsideScope(document.createElement("div"), inner)).toBe(false);
	});

	it("closestCrossShadow finds an ancestor by selector", () => {
		const wrap = document.createElement("div");
		wrap.className = "scope";
		const child = document.createElement("button");
		wrap.appendChild(child);
		document.body.appendChild(wrap);
		expect(closestCrossShadow(child, ".scope")).toBe(wrap);
		expect(closestCrossShadow(child, ".missing")).toBeUndefined();
	});
});

describe("elementSafeTagName", () => {
	it("returns the upper-case tag name", () => {
		expect(elementSafeTagName(document.createElement("div"))).toBe("DIV");
	});

	it("returns FORM even when a named field shadows tagName", () => {
		const form = document.createElement("form");
		const input = document.createElement("input");
		input.setAttribute("name", "tagName");
		form.appendChild(input);
		expect(elementSafeTagName(form)).toBe("FORM");
	});
});

describe("computed style + caching", () => {
	it("returns a computed style and memoizes it within a cache scope", () => {
		const el = document.createElement("div");
		document.body.appendChild(el);
		beginDOMCaches();
		try {
			const first = getElementComputedStyle(el);
			const second = getElementComputedStyle(el);
			expect(first).toBeDefined();
			// Same object instance served from the cache.
			expect(second).toBe(first);
		} finally {
			endDOMCaches();
		}
	});

	it("isElementStyleVisibilityVisible honors visibility:hidden", () => {
		const visible = document.createElement("div");
		document.body.appendChild(visible);
		expect(isElementStyleVisibilityVisible(visible)).toBe(true);

		const hidden = document.createElement("div");
		hidden.style.visibility = "hidden";
		document.body.appendChild(hidden);
		expect(isElementStyleVisibilityVisible(hidden)).toBe(false);
	});
});
