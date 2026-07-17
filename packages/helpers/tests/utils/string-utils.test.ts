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

import { describe, expect, it } from "vitest";
import {
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
} from "../../src/utils/string-utils.js";

describe("escapeHTML", () => {
	it("escapes & and < in text content", () => {
		expect(escapeHTML("a < b && c")).toBe("a &lt; b &amp;&amp; c");
	});
	it("leaves > \" ' untouched (text content)", () => {
		expect(escapeHTML(`a > "b" 'c'`)).toBe(`a > "b" 'c'`);
	});
});

describe("escapeHTMLAttribute", () => {
	it("escapes all five special characters", () => {
		expect(escapeHTMLAttribute(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
	});
});

describe("escapeRegExp", () => {
	it("escapes regex metacharacters so the string matches literally", () => {
		const escaped = escapeRegExp("a.b*c(d)");
		expect(escaped).toBe("a\\.b\\*c\\(d\\)");
		expect(new RegExp(escaped).test("a.b*c(d)")).toBe(true);
		expect(new RegExp(escaped).test("axbxcxd")).toBe(false);
	});
});

describe("normalizeWhiteSpace", () => {
	it("collapses whitespace, trims, and strips zero-width/soft-hyphen", () => {
		expect(normalizeWhiteSpace("  a\t\n b\u200b\u00ad c  ")).toBe("a b c");
	});
});

describe("case conversion", () => {
	it("toTitleCase upper-cases only the first char", () => {
		expect(toTitleCase("hello world")).toBe("Hello world");
	});
	it("toSnakeCase handles acronyms", () => {
		expect(toSnakeCase("ignoreHTTPSErrors")).toBe("ignore_https_errors");
		expect(toSnakeCase("simpleCase")).toBe("simple_case");
	});
});

describe("trimString", () => {
	it("returns input untouched when within cap", () => {
		expect(trimString("hello", 10)).toBe("hello");
	});
	it("truncates with a suffix accounted for in the cap", () => {
		expect(trimString("hello world", 8, "...")).toBe("hello...");
	});
	it("trimStringWithEllipsis uses a single-char ellipsis", () => {
		expect(trimStringWithEllipsis("hello", 4)).toBe("hel…");
	});
	it("counts code points, not UTF-16 units", () => {
		expect([...trimString("😀😀😀😀", 2)]).toHaveLength(2);
	});
});

describe("truncateDataUrl", () => {
	it("collapses the payload but keeps the media-type prefix", () => {
		expect(truncateDataUrl("data:image/png;base64,AAAABBBBCCCC")).toBe("data:image/png;base64,…");
	});
	it("leaves non-data URLs untouched", () => {
		expect(truncateDataUrl("https://example.com/x.png")).toBe("https://example.com/x.png");
	});
});

describe("escapeWithQuotes / escapeTemplateString", () => {
	it("quotes and escapes the matching quote char", () => {
		expect(escapeWithQuotes("it's", "'")).toBe("'it\\'s'");
		expect(escapeWithQuotes('say "hi"', '"')).toBe('"say \\"hi\\""');
	});
	it("throws on an invalid quote char", () => {
		expect(() => escapeWithQuotes("x", "|")).toThrow("Invalid escape char");
	});
	it("escapes backtick and ${ for template literals", () => {
		expect(escapeTemplateString("a`b${c}")).toBe("a\\`b\\${c}");
	});
});
