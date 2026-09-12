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

import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPathContained, resolveContainedPath, sanitizeFilename } from "../src/paths.js";

/** Base directory used throughout. Nothing in this suite touches the filesystem. */
const BASE = path.resolve("/srv/uploads");

// ============================================
// Containment
// ============================================

describe("resolveContainedPath", () => {
	it("accepts a plain filename", () => {
		expect(resolveContainedPath(BASE, "avatar.png")).toBe(path.join(BASE, "avatar.png"));
	});

	it("accepts a nested path", () => {
		expect(resolveContainedPath(BASE, "2026/january/inv.pdf")).toBe(
			path.join(BASE, "2026", "january", "inv.pdf"),
		);
	});

	it("normalizes an interior traversal that stays inside", () => {
		expect(resolveContainedPath(BASE, "a/../b.txt")).toBe(path.join(BASE, "b.txt"));
	});

	it("accepts a leading ./", () => {
		expect(resolveContainedPath(BASE, "./ok.txt")).toBe(path.join(BASE, "ok.txt"));
	});

	it("rejects relative traversal that escapes", () => {
		expect(resolveContainedPath(BASE, "../../etc/passwd")).toBeNull();
	});

	it("rejects an interior traversal that escapes", () => {
		expect(resolveContainedPath(BASE, "a/../../b.txt")).toBeNull();
	});

	it("rejects a bare parent reference", () => {
		expect(resolveContainedPath(BASE, "..")).toBeNull();
	});

	it("rejects an absolute path, which path.resolve would otherwise honour", () => {
		// The case detection alone misses: `/etc/passwd` contains no `../`.
		expect(resolveContainedPath(BASE, "/etc/passwd")).toBeNull();
	});

	it("rejects non-string arguments", () => {
		expect(resolveContainedPath(BASE, null as unknown as string)).toBeNull();
		expect(resolveContainedPath(null as unknown as string, "a.txt")).toBeNull();
	});

	it("rejects an empty base directory", () => {
		expect(resolveContainedPath("", "a.txt")).toBeNull();
	});

	it("returns the base itself by default", () => {
		expect(resolveContainedPath(BASE, "")).toBe(BASE);
	});

	it("can refuse the base itself", () => {
		expect(resolveContainedPath(BASE, "", { allowBaseItself: false })).toBeNull();
		expect(resolveContainedPath(BASE, ".", { allowBaseItself: false })).toBeNull();
	});

	it("does not treat a sibling directory with a shared prefix as contained", () => {
		// A naive `resolved.startsWith(base)` check accepts `/srv/uploads-evil`.
		expect(resolveContainedPath("/srv/uploads", "../uploads-evil/x.txt")).toBeNull();
	});
});

describe("isPathContained", () => {
	it("mirrors resolveContainedPath as a boolean", () => {
		expect(isPathContained(BASE, "a.txt")).toBe(true);
		expect(isPathContained(BASE, "../a.txt")).toBe(false);
	});
});

// ============================================
// Filename sanitization
// ============================================

describe("sanitizeFilename", () => {
	it("strips directory separators", () => {
		expect(sanitizeFilename("../../etc/passwd")).toBe("etcpasswd");
	});

	it("strips Windows-reserved characters", () => {
		expect(sanitizeFilename('a<b>c:d"e|f?g*h.txt')).toBe("abcdefgh.txt");
	});

	it("removes leading dots so the result cannot be hidden or a parent reference", () => {
		expect(sanitizeFilename(".hidden")).toBe("hidden");
		expect(sanitizeFilename("..")).toBe("file");
	});

	it("trims the trailing dots Windows would silently drop", () => {
		// `evil.php.` becomes `evil.php` on disk after the fact, defeating an
		// extension check performed against the original string.
		expect(sanitizeFilename("evil.php.")).toBe("evil.php");
	});

	it("refuses Windows device names regardless of extension", () => {
		expect(sanitizeFilename("CON")).toBe("file");
		expect(sanitizeFilename("CON.txt")).toBe("file");
		expect(sanitizeFilename("lpt1.log")).toBe("file");
	});

	it("leaves ordinary filenames untouched", () => {
		expect(sanitizeFilename("quarterly-report-2026.pdf")).toBe("quarterly-report-2026.pdf");
		expect(sanitizeFilename("archive.tar.gz")).toBe("archive.tar.gz");
	});

	it("preserves international filenames", () => {
		expect(sanitizeFilename("отчёт.pdf")).toBe("отчёт.pdf");
		expect(sanitizeFilename("報告書.xlsx")).toBe("報告書.xlsx");
	});

	it("truncates over-long names while keeping the extension", () => {
		const result = sanitizeFilename(`${"a".repeat(400)}.pdf`);
		expect(result.length).toBeLessThanOrEqual(255);
		expect(result.endsWith(".pdf")).toBe(true);
	});

	it("falls back when nothing usable survives", () => {
		expect(sanitizeFilename("")).toBe("file");
		expect(sanitizeFilename("///")).toBe("file");
		expect(sanitizeFilename("///", "upload")).toBe("upload");
	});

	it("still requires a containment check on the joined result", () => {
		// sanitizeFilename is hygiene, not the control. This pairing is the pattern
		// callers should follow.
		const segment = sanitizeFilename("../../etc/passwd");
		expect(resolveContainedPath(BASE, segment)).toBe(path.join(BASE, "etcpasswd"));
	});
});
