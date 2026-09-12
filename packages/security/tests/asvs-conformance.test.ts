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
 * @fileoverview Keeps `ASVS-CONFORMANCE.md` honest.
 *
 * A conformance map is a claim about code, and a claim nothing checks is one that rots on
 * the first rename. This parses the document and fails when a named export stops
 * resolving, a named proving test disappears, or a requirement is claimed in two places
 * at once.
 *
 * It cannot verify that an *application* conforms — nothing can, from inside a
 * dependency. It verifies only that the document describes the code that actually ships.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as publicApi from "../src/index.js";

const PACKAGE_ROOT = join(import.meta.dirname, "..");
const DOCUMENT = readFileSync(join(PACKAGE_ROOT, "ASVS-CONFORMANCE.md"), "utf8");

/** One parsed requirement row. */
interface Row {
	readonly id: string;
	readonly level: string;
	readonly columns: readonly string[];
	readonly section: number;
}

/** Backticked identifiers inside a table cell. */
function backticked(cell: string): string[] {
	return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] as string);
}

/**
 * Parse every requirement row, tagged with the section it appears in.
 *
 * Sections are delimited by the numbered headings, so a row moving between them is
 * visible to the duplicate check below.
 */
function parseRows(): Row[] {
	const rows: Row[] = [];
	let section = 0;
	for (const line of DOCUMENT.split("\n")) {
		const heading = /^## (\d)\./.exec(line);
		if (heading) {
			section = Number(heading[1]);
			continue;
		}
		if (!line.startsWith("|")) continue;
		const columns = line
			.split("|")
			.slice(1, -1)
			.map((cell) => cell.trim());
		const id = columns[0] ?? "";
		if (!/^\d+\.\d+\.\d+$/.test(id)) continue;
		rows.push({ id, level: columns[1] ?? "", columns, section });
	}
	return rows;
}

const rows = parseRows();
const supported = rows.filter((row) => row.section === 1);

describe("ASVS conformance map", () => {
	it("parses the document into requirement rows", () => {
		expect(rows.length).toBeGreaterThan(25);
		expect(supported.length).toBeGreaterThan(10);
	});

	it("pins the ASVS source to a commit", () => {
		expect(DOCUMENT).toMatch(/OWASP\/ASVS commit `[0-9a-f]{40}`/);
	});

	// The claim that would be easiest to overstate, so it is stated once and checked.
	it("states plainly that OWASP certifies nothing", () => {
		expect(DOCUMENT).toContain("does not certify any vendors, verifiers, or software");
	});

	it("uses only valid requirement levels", () => {
		const invalid = rows
			.filter((row) => !["1", "2", "3"].includes(row.level))
			.map((row) => `${row.id} level=${row.level}`);
		expect(invalid).toEqual([]);
	});

	// The guard against a row quietly migrating from "detected but not controlled" to
	// "supported by an export" without anyone noticing the claim got stronger.
	it("claims each requirement in exactly one section", () => {
		const seen = new Map<string, number[]>();
		for (const row of rows) {
			seen.set(row.id, [...(seen.get(row.id) ?? []), row.section]);
		}
		const duplicated = [...seen.entries()]
			.filter(([, sections]) => sections.length > 1)
			.map(([id, sections]) => `${id} in sections ${sections.join(", ")}`);
		expect(duplicated).toEqual([]);
	});

	describe("section 1 rows", () => {
		it("names at least one export and one proving test each", () => {
			const incomplete = supported
				.filter(
					(row) =>
						backticked(row.columns[3] ?? "").length === 0 ||
						backticked(row.columns[4] ?? "").length === 0,
				)
				.map((row) => row.id);
			expect(incomplete).toEqual([]);
		});

		// The load-bearing assertion. A rename that leaves the document behind fails here,
		// rather than shipping a conformance claim about a function nobody can import.
		it("resolves every named export from the public entry point", () => {
			const missing: string[] = [];
			for (const row of supported) {
				for (const name of backticked(row.columns[3] ?? "")) {
					if (!(name in publicApi)) missing.push(`${row.id}: ${name}`);
				}
			}
			expect(missing).toEqual([]);
		});

		it("points at proving tests that exist", () => {
			const missing: string[] = [];
			for (const row of supported) {
				for (const path of backticked(row.columns[4] ?? "")) {
					if (!existsSync(join(PACKAGE_ROOT, path))) missing.push(`${row.id}: ${path}`);
				}
			}
			expect(missing).toEqual([]);
		});
	});

	// Sections 2 and 3 are the honest half, and a row with no stated reason is just a gap
	// with a table cell around it.
	it("gives every uncovered requirement a written reason", () => {
		const unexplained = rows
			.filter((row) => row.section === 2 || row.section === 3)
			.filter((row) => (row.columns[2] ?? "").length < 30)
			.map((row) => row.id);
		expect(unexplained).toEqual([]);
	});
});
