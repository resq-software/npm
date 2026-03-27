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
 * @file Rabin-Karp String Matching Algorithm
 * @module dsa/rabin-karp
 * @description Efficient pattern matching using rolling hash for document search.
 *              O(n+m) average case, O(nm) worst case.
 */

import {
    RabinKarpMultiSearchSchema,
    RabinKarpOptionsSchema,
    RabinKarpSearchSchema,
    validateSafe,
} from './schemas.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Result of a pattern match
 */
export interface PatternMatch {
  /** Starting index of the match in the text */
  index: number;
  /** The matched substring */
  match: string;
  /** Line number (if text contains newlines) */
  line?: number;
  /** Column number within the line */
  column?: number;
}

/**
 * Options for Rabin-Karp search
 */
export interface RabinKarpOptions {
  /** Whether to perform case-insensitive search (default: false) */
  caseInsensitive?: boolean;
  /** Maximum number of matches to return (default: unlimited) */
  maxMatches?: number;
  /** Include line/column information (default: true) */
  includeLineInfo?: boolean;
}

/**
 * Statistics for search operation
 */
export interface SearchStats {
  /** Total characters processed */
  charactersProcessed: number;
  /** Number of hash collisions (false positives checked) */
  hashCollisions: number;
  /** Number of matches found */
  matchesFound: number;
  /** Time taken in milliseconds */
  timeTakenMs: number;
}

// ============================================
// Constants
// ============================================

/**
 * Base for polynomial rolling hash (number of characters in the input alphabet)
 * Using 256 for extended ASCII support
 */
const BASE = 256;

/**
 * Modulus for hash to prevent integer overflow
 * Using a large prime number
 */
const MOD = 1_000_000_007;

// ============================================
// Rabin-Karp Implementation
// ============================================

/**
 * Rabin-Karp string matching algorithm implementation
 *
 * Uses rolling hash for efficient pattern matching in text.
 * Particularly efficient for multiple pattern searches.
 *
 * Time Complexity:
 * - Average case: O(n + m) where n = text length, m = pattern length
 * - Worst case: O(nm) with many hash collisions
 *
 * Space Complexity: O(1) for single pattern, O(k) for k patterns
 *
 * @example
 * ```typescript
 * const matcher = new RabinKarp();
 *
 * // Single pattern search
 * const matches = matcher.search('The quick brown fox', 'quick');
 * // Returns [{ index: 4, match: 'quick' }]
 *
 * // Multiple patterns
 * const multiMatches = matcher.searchMultiple(
 *   'The quick brown fox jumps over the lazy dog',
 *   ['quick', 'fox', 'dog']
 * );
 * ```
 */
export class RabinKarp {
  private readonly caseInsensitive: boolean;
  private readonly maxMatches: number;
  private readonly includeLineInfo: boolean;

  /**
   * Creates a new Rabin-Karp matcher
   * @param options - Configuration options
   * @throws Error if options validation fails
   */
  constructor(options: RabinKarpOptions = {}) {
    // Validate options using Effect Schema
    const validation = validateSafe(RabinKarpOptionsSchema, options);
    if (!validation.success) {
      throw new Error(`Invalid RabinKarp options: ${validation.error}`);
    }
    const validatedOptions = validation.data;

    this.caseInsensitive = validatedOptions.caseInsensitive ?? false;
    this.maxMatches = validatedOptions.maxMatches ?? Number.MAX_SAFE_INTEGER;
    this.includeLineInfo = validatedOptions.includeLineInfo ?? true;
  }

  /**
   * Searches for a pattern in text using Rabin-Karp algorithm
   *
   * @param text - The text to search in
   * @param pattern - The pattern to search for
   * @returns Array of matches found
   */
  search(text: string, pattern: string): PatternMatch[] {
    // Validate search input
    const validation = validateSafe(RabinKarpSearchSchema, { text, pattern });
    if (!validation.success || pattern.length > text.length) {
      return [];
    }

    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;
    const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

    const matches: PatternMatch[] = [];
    const n = normalizedText.length;
    const m = normalizedPattern.length;

    // Calculate hash for pattern and first window of text
    const patternHash = this.calculateHash(normalizedPattern, m);
    let textHash = this.calculateHash(normalizedText, m);

    // Precompute BASE^(m-1) % MOD for rolling hash
    let h = 1;
    for (let i = 0; i < m - 1; i++) {
      h = (h * BASE) % MOD;
    }

    // Line tracking for includeLineInfo
    const lineStarts = this.includeLineInfo ? this.getLineStarts(text) : [];

    // Slide the pattern over text
    for (let i = 0; i <= n - m; i++) {
      // Check if hash values match
      if (patternHash === textHash) {
        // Verify actual string match (to handle hash collisions)
        if (this.verifyMatch(normalizedText, normalizedPattern, i)) {
          const match: PatternMatch = {
            index: i,
            match: text.substring(i, i + m),
          };

          if (this.includeLineInfo) {
            const lineInfo = this.getLineAndColumn(i, lineStarts);
            match.line = lineInfo.line;
            match.column = lineInfo.column;
          }

          matches.push(match);

          if (matches.length >= this.maxMatches) {
            return matches;
          }
        }
      }

      // Calculate hash for next window (rolling hash)
      if (i < n - m) {
        textHash = this.rollingHash(
          textHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + m),
          h,
        );
      }
    }

    return matches;
  }

  /**
   * Searches for multiple patterns simultaneously
   *
   * @param text - The text to search in
   * @param patterns - Array of patterns to search for
   * @returns Map of pattern to matches
   */
  searchMultiple(text: string, patterns: string[]): Map<string, PatternMatch[]> {
    const results = new Map<string, PatternMatch[]>();

    // Validate multi-search input
    const validation = validateSafe(RabinKarpMultiSearchSchema, { text, patterns });
    if (!validation.success) {
      return results;
    }

    // Filter out patterns longer than text
    const validPatterns = patterns.filter((p) => p.length <= text.length);

    // Group patterns by length for optimization
    const patternsByLength = new Map<number, string[]>();
    for (const pattern of validPatterns) {
      const len = pattern.length;
      const group = patternsByLength.get(len) ?? [];
      group.push(pattern);
      patternsByLength.set(len, group);
    }

    // Search for each length group
    for (const [length, patternGroup] of patternsByLength) {
      const groupMatches = this.searchPatternGroup(text, patternGroup, length);

      for (const [pattern, matches] of groupMatches) {
        results.set(pattern, matches);
      }
    }

    return results;
  }

  /**
   * Searches with statistics for performance monitoring
   *
   * @param text - The text to search in
   * @param pattern - The pattern to search for
   * @returns Object containing matches and statistics
   */
  searchWithStats(text: string, pattern: string): { matches: PatternMatch[]; stats: SearchStats } {
    const startTime = performance.now();
    let hashCollisions = 0;

    if (!text || !pattern || pattern.length > text.length) {
      return {
        matches: [],
        stats: {
          charactersProcessed: 0,
          hashCollisions: 0,
          matchesFound: 0,
          timeTakenMs: performance.now() - startTime,
        },
      };
    }

    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;
    const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

    const matches: PatternMatch[] = [];
    const n = normalizedText.length;
    const m = normalizedPattern.length;

    const patternHash = this.calculateHash(normalizedPattern, m);
    let textHash = this.calculateHash(normalizedText, m);

    let h = 1;
    for (let i = 0; i < m - 1; i++) {
      h = (h * BASE) % MOD;
    }

    const lineStarts = this.includeLineInfo ? this.getLineStarts(text) : [];

    for (let i = 0; i <= n - m; i++) {
      if (patternHash === textHash) {
        if (this.verifyMatch(normalizedText, normalizedPattern, i)) {
          const match: PatternMatch = {
            index: i,
            match: text.substring(i, i + m),
          };

          if (this.includeLineInfo) {
            const lineInfo = this.getLineAndColumn(i, lineStarts);
            match.line = lineInfo.line;
            match.column = lineInfo.column;
          }

          matches.push(match);

          if (matches.length >= this.maxMatches) {
            break;
          }
        } else {
          hashCollisions++;
        }
      }

      if (i < n - m) {
        textHash = this.rollingHash(
          textHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + m),
          h,
        );
      }
    }

    return {
      matches,
      stats: {
        charactersProcessed: n,
        hashCollisions,
        matchesFound: matches.length,
        timeTakenMs: performance.now() - startTime,
      },
    };
  }

  /**
   * Finds all unique patterns of a given length that appear more than once
   * Useful for finding duplicate phrases in documents
   *
   * @param text - The text to analyze
   * @param patternLength - Length of patterns to find
   * @param minOccurrences - Minimum occurrences to include (default: 2)
   * @returns Map of patterns to their occurrence count
   */
  findRepeatedPatterns(
    text: string,
    patternLength: number,
    minOccurrences = 2,
  ): Map<string, number> {
    const occurrences = new Map<string, number>();

    if (!text || patternLength <= 0 || patternLength > text.length) {
      return occurrences;
    }

    const hashToPatterns = new Map<number, string[]>();
    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;

    let h = 1;
    for (let i = 0; i < patternLength - 1; i++) {
      h = (h * BASE) % MOD;
    }

    let currentHash = this.calculateHash(normalizedText, patternLength);

    for (let i = 0; i <= normalizedText.length - patternLength; i++) {
      const pattern = text.substring(i, i + patternLength);
      const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

      // Check for patterns with same hash
      const existingPatterns = hashToPatterns.get(currentHash) ?? [];

      let found = false;
      for (const existing of existingPatterns) {
        const normalizedExisting = this.caseInsensitive ? existing.toLowerCase() : existing;
        if (normalizedExisting === normalizedPattern) {
          occurrences.set(existing, (occurrences.get(existing) ?? 1) + 1);
          found = true;
          break;
        }
      }

      if (!found) {
        existingPatterns.push(pattern);
        hashToPatterns.set(currentHash, existingPatterns);
      }

      // Rolling hash for next position
      if (i < normalizedText.length - patternLength) {
        currentHash = this.rollingHash(
          currentHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + patternLength),
          h,
        );
      }
    }

    // Filter by minimum occurrences
    const result = new Map<string, number>();
    for (const [pattern, count] of occurrences) {
      if (count >= minOccurrences) {
        result.set(pattern, count);
      }
    }

    return result;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private calculateHash(str: string, length: number): number {
    let hash = 0;

    for (let i = 0; i < length; i++) {
      hash = (hash * BASE + str.charCodeAt(i)) % MOD;
    }

    return hash;
  }

  private rollingHash(oldHash: number, oldChar: number, newChar: number, h: number): number {
    let newHash = (oldHash - oldChar * h) % MOD;
    newHash = (newHash * BASE + newChar) % MOD;

    // Handle negative modulo
    if (newHash < 0) {
      newHash += MOD;
    }

    return newHash;
  }

  private verifyMatch(text: string, pattern: string, startIndex: number): boolean {
    for (let i = 0; i < pattern.length; i++) {
      if (text[startIndex + i] !== pattern[i]) {
        return false;
      }
    }
    return true;
  }

  private getLineStarts(text: string): number[] {
    const starts = [0];

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        starts.push(i + 1);
      }
    }

    return starts;
  }

  private getLineAndColumn(index: number, lineStarts: number[]): { line: number; column: number } {
    let line = 1;

    for (let i = lineStarts.length - 1; i >= 0; i--) {
      const start = lineStarts[i];
      if (start !== undefined && start <= index) {
        line = i + 1;
        return {
          line,
          column: index - start + 1,
        };
      }
    }

    return { line: 1, column: index + 1 };
  }

  private searchPatternGroup(
    text: string,
    patterns: string[],
    length: number,
  ): Map<string, PatternMatch[]> {
    const results = new Map<string, PatternMatch[]>();
    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;

    // Initialize results
    for (const pattern of patterns) {
      results.set(pattern, []);
    }

    // Calculate pattern hashes
    const patternHashes = new Map<number, string[]>();
    for (const pattern of patterns) {
      const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;
      const hash = this.calculateHash(normalizedPattern, length);
      const existing = patternHashes.get(hash) ?? [];
      existing.push(pattern);
      patternHashes.set(hash, existing);
    }

    // Calculate initial text hash
    let textHash = this.calculateHash(normalizedText, length);
    let h = 1;
    for (let i = 0; i < length - 1; i++) {
      h = (h * BASE) % MOD;
    }

    const lineStarts = this.includeLineInfo ? this.getLineStarts(text) : [];

    // Slide through text
    for (let i = 0; i <= normalizedText.length - length; i++) {
      const matchingPatterns = patternHashes.get(textHash);

      if (matchingPatterns) {
        for (const pattern of matchingPatterns) {
          const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

          if (this.verifyMatch(normalizedText, normalizedPattern, i)) {
            const matches = results.get(pattern) ?? [];

            const match: PatternMatch = {
              index: i,
              match: text.substring(i, i + length),
            };

            if (this.includeLineInfo) {
              const lineInfo = this.getLineAndColumn(i, lineStarts);
              match.line = lineInfo.line;
              match.column = lineInfo.column;
            }

            matches.push(match);
            results.set(pattern, matches);
          }
        }
      }

      // Rolling hash
      if (i < normalizedText.length - length) {
        textHash = this.rollingHash(
          textHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + length),
          h,
        );
      }
    }

    return results;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Quick search function for simple use cases
 *
 * @param text - Text to search in
 * @param pattern - Pattern to find
 * @param caseInsensitive - Whether to ignore case
 * @returns Array of match indices
 */
export function quickSearch(text: string, pattern: string, caseInsensitive = true): number[] {
  const matcher = new RabinKarp({ caseInsensitive, includeLineInfo: false });
  return matcher.search(text, pattern).map((m) => m.index);
}
