/*
 * Copyright 2026 ResQ Software
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
 * @file Rabin-Karp String Matching Algorithm Tests
 * @module tests/dsa/rabin-karp
 */

import { describe, expect, it } from "vitest";
import { RabinKarp } from "../src/rabin-karp.js";

describe("RabinKarp", () => {
	describe("constructor", () => {
		it("should create with default options", () => {
			const matcher = new RabinKarp();
			expect(matcher).toBeInstanceOf(RabinKarp);
		});

		it("should accept custom options", () => {
			const matcher = new RabinKarp({
				caseInsensitive: true,
				maxMatches: 10,
				includeLineInfo: false,
			});
			expect(matcher).toBeInstanceOf(RabinKarp);
		});

		it("should throw error for invalid maxMatches", () => {
			expect(() => new RabinKarp({ maxMatches: -1 })).toThrow();
			expect(() => new RabinKarp({ maxMatches: 0 })).toThrow();
		});
	});

	describe("search", () => {
		it("should find single pattern match", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("The quick brown fox", "quick");
			expect(matches.length).toBe(1);
			expect(matches[0]?.index).toBe(4);
			expect(matches[0]?.match).toBe("quick");
		});

		it("should find multiple occurrences", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("aba aba aba", "aba");
			expect(matches.length).toBe(3);
		});

		it("should return empty array for no match", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("Hello world", "xyz");
			expect(matches.length).toBe(0);
		});

		it("should return empty for pattern longer than text", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("Hi", "Hello world");
			expect(matches.length).toBe(0);
		});

		it("should return empty for empty text", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("", "test");
			expect(matches.length).toBe(0);
		});

		it("should return empty for empty pattern", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("Hello", "");
			expect(matches.length).toBe(0);
		});

		it("should perform case-insensitive search when enabled", () => {
			const matcher = new RabinKarp({ caseInsensitive: true });
			const matches = matcher.search("FBI and fbi and Fbi", "FBI");
			expect(matches.length).toBe(3);
		});

		it("should be case-sensitive by default", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("FBI and fbi", "fbi");
			expect(matches.length).toBe(1);
			expect(matches[0]?.index).toBe(8);
		});

		it("should respect maxMatches option", () => {
			const matcher = new RabinKarp({ maxMatches: 2 });
			const matches = matcher.search("aaa aaa aaa aaa", "aaa");
			expect(matches.length).toBe(2);
		});

		it("should include line and column info by default", () => {
			const matcher = new RabinKarp();
			const text = "Line 1\nLine 2 with pattern\nLine 3";
			const matches = matcher.search(text, "pattern");
			expect(matches.length).toBe(1);
			expect(matches[0]?.line).toBe(2);
			expect(matches[0]?.column).toBeGreaterThan(0);
		});

		it("should handle overlapping patterns", () => {
			const matcher = new RabinKarp();
			const matches = matcher.search("aaaa", "aa");
			expect(matches.length).toBe(3); // positions 0, 1, 2
		});
	});

	describe("searchMultiple", () => {
		it("should search for multiple patterns", () => {
			const matcher = new RabinKarp();
			const text = "The quick brown fox jumps over the lazy dog";
			const results = matcher.searchMultiple(text, ["quick", "fox", "dog"]);

			expect(results.size).toBe(3);
			expect(results.get("quick")?.length).toBe(1);
			expect(results.get("fox")?.length).toBe(1);
			expect(results.get("dog")?.length).toBe(1);
		});

		it("should handle patterns not found", () => {
			const matcher = new RabinKarp();
			const results = matcher.searchMultiple("Hello world", ["xyz", "abc"]);
			expect(results.get("xyz")?.length ?? 0).toBe(0);
			expect(results.get("abc")?.length ?? 0).toBe(0);
		});

		it("should handle empty patterns array", () => {
			const matcher = new RabinKarp();
			const results = matcher.searchMultiple("Hello world", []);
			expect(results.size).toBe(0);
		});

		it("should filter patterns longer than text", () => {
			const matcher = new RabinKarp();
			const results = matcher.searchMultiple("Hi", ["Hello world", "Hi"]);
			expect(results.get("Hi")?.length).toBe(1);
		});
	});

	describe("searchWithStats", () => {
		it("should return matches with statistics", () => {
			const matcher = new RabinKarp();
			const { matches, stats } = matcher.searchWithStats(
				"The quick brown fox",
				"quick",
			);

			expect(matches.length).toBe(1);
			expect(stats.matchesFound).toBe(1);
			expect(stats.charactersProcessed).toBeGreaterThan(0);
			expect(typeof stats.timeTakenMs).toBe("number");
		});

		it("should track hash collisions", () => {
			const matcher = new RabinKarp();
			const { stats } = matcher.searchWithStats(
				"The quick brown fox jumps",
				"fox",
			);
			expect(typeof stats.hashCollisions).toBe("number");
		});

		it("should handle empty inputs", () => {
			const matcher = new RabinKarp();
			const { matches, stats } = matcher.searchWithStats("", "test");
			expect(matches.length).toBe(0);
			expect(stats.charactersProcessed).toBe(0);
		});
	});

	describe("document search scenarios", () => {
		it("should find classified terms in document", () => {
			const matcher = new RabinKarp({ caseInsensitive: true });
			const document = `
        This document contains CONFIDENTIAL information.
        Some parts are CLASSIFIED as TOP SECRET.
        Review required for RESTRICTED sections.
      `;
			const results = matcher.searchMultiple(document, [
				"confidential",
				"classified",
				"top secret",
				"restricted",
			]);

			expect(results.get("confidential")?.length).toBe(1);
			expect(results.get("classified")?.length).toBe(1);
			expect(results.get("top secret")?.length).toBe(1);
			expect(results.get("restricted")?.length).toBe(1);
		});

		it("should find PII patterns", () => {
			const matcher = new RabinKarp();
			const document = "Contact: john.doe@agency.gov or jane.smith@agency.gov";
			const matches = matcher.search(document, "@agency.gov");
			expect(matches.length).toBe(2);
		});

		it("should handle large text efficiently", () => {
			const matcher = new RabinKarp();
			const largeText = "Lorem ipsum ".repeat(10000) + "FOIA REQUEST";
			const { stats } = matcher.searchWithStats(largeText, "FOIA REQUEST");
			expect(stats.matchesFound).toBe(1);
			expect(stats.timeTakenMs).toBeLessThan(1000);
		});
	});
});
