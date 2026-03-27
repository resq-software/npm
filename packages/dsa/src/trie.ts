/**
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
 * @file Trie (Prefix Tree) Data Structure
 * @module dsa/trie
 * @description Efficient prefix-based search with generic data storage.
 *              Provides O(k) lookup where k is the prefix length.
 */

import {
  TrieInsertSchema,
  type TrieOptions,
  TrieOptionsSchema,
  TrieSearchSchema,
  validateSafe,
} from './schemas.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Represents a node in the Trie
 * @template T - Type of data stored at word endings
 */
interface TrieNode<T> {
  /** Child nodes mapped by character */
  children: Map<string, TrieNode<T>>;
  /** Whether this node marks the end of a word */
  isEndOfWord: boolean;
  /** Data associated with the word (if end of word) */
  data: T | null;
  /** Number of words passing through this node (for ranking) */
  frequency: number;
}

/**
 * Search result with relevance score
 * @template T - Type of stored data
 */
export interface TrieSearchResult<T> {
  /** The matched word */
  word: string;
  /** Associated data */
  data: T;
  /** Relevance score based on frequency */
  score: number;
}

// Re-export TrieOptions from schemas for consumers
export type { TrieOptions };

// ============================================
// Trie Implementation
// ============================================

/**
 * Trie (Prefix Tree) for efficient prefix-based autocomplete
 *
 * Time Complexity:
 * - insert: O(k) where k is word length
 * - search: O(k) for exact match
 * - startsWith: O(k + m) where m is number of results
 * - delete: O(k)
 *
 * Space Complexity: O(ALPHABET_SIZE * k * n) where n is number of words
 *
 * @template T - Type of data stored with each word
 *
 * @example
 * ```typescript
 * const trie = new Trie<{ id: string }>();
 * trie.insert('hello', { id: '1' });
 * const results = trie.searchByPrefix('hel');
 * ```
 */
export class Trie<T> {
  private root: TrieNode<T>;
  private readonly caseInsensitive: boolean;
  private readonly maxResults: number;
  private size: number;

  /**
   * Creates a new Trie instance
   * @param options - Configuration options
   * @throws Error if options validation fails
   */
  constructor(options: TrieOptions = {}) {
    const validation = validateSafe(TrieOptionsSchema, options);
    if (!validation.success) {
      throw new Error(`Invalid Trie options: ${validation.error}`);
    }
    const validatedOptions = validation.data;

    this.root = this.createNode();
    this.caseInsensitive = validatedOptions.caseInsensitive ?? true;
    this.maxResults = validatedOptions.maxResults ?? 10;
    this.size = 0;
  }

  private createNode(): TrieNode<T> {
    return { children: new Map(), isEndOfWord: false, data: null, frequency: 0 };
  }

  private normalizeKey(key: string): string {
    return this.caseInsensitive ? key.toLowerCase() : key;
  }

  /**
   * Inserts a word with associated data into the Trie
   * @returns This Trie instance for chaining
   */
  insert(word: string, data: T): this {
    const validation = validateSafe(TrieInsertSchema, { word: word?.trim() || '' });
    if (!validation.success) return this;

    const normalizedWord = this.normalizeKey(validation.data.word);
    let current = this.root;

    for (const char of normalizedWord) {
      if (!current.children.has(char)) {
        current.children.set(char, this.createNode());
      }
      const next = current.children.get(char);
      if (next) {
        current = next;
        current.frequency++;
      }
    }

    if (!current.isEndOfWord) this.size++;
    current.isEndOfWord = true;
    current.data = data;

    return this;
  }

  /**
   * Bulk insert multiple words with data
   * @returns This Trie instance for chaining
   */
  insertMany(entries: Array<[string, T]>): this {
    for (const [word, data] of entries) {
      this.insert(word, data);
    }
    return this;
  }

  /**
   * Searches for an exact word match
   * @returns The associated data or null if not found
   */
  search(word: string): T | null {
    const node = this.findNode(word);
    return node?.isEndOfWord ? node.data : null;
  }

  /**
   * Checks if a word exists in the Trie
   */
  has(word: string): boolean {
    const node = this.findNode(word);
    return node?.isEndOfWord ?? false;
  }

  /**
   * Checks if any word starts with the given prefix
   */
  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  /**
   * Finds all words starting with the given prefix
   *
   * @param prefix - The prefix to search for
   * @param limit - Maximum number of results (defaults to maxResults option)
   * @returns Array of search results sorted by relevance
   */
  searchByPrefix(prefix: string, limit?: number): TrieSearchResult<T>[] {
    const validation = validateSafe(TrieSearchSchema, {
      prefix: prefix?.trim() || '',
      limit,
    });
    if (!validation.success) return [];

    const maxCount = validation.data.limit ?? this.maxResults;
    const normalizedPrefix = this.normalizeKey(validation.data.prefix);

    if (!normalizedPrefix) return [];

    const prefixNode = this.findNode(prefix);
    if (!prefixNode) return [];

    const results: TrieSearchResult<T>[] = [];
    this.collectWords(prefixNode, normalizedPrefix, results, maxCount);

    return results.sort((a, b) => b.score - a.score).slice(0, maxCount);
  }

  /**
   * Deletes a word from the Trie
   * @returns True if the word was deleted
   */
  delete(word: string): boolean {
    const normalizedWord = this.normalizeKey(word.trim());
    if (!normalizedWord) return false;
    return this.deleteRecursive(this.root, normalizedWord, 0);
  }

  /**
   * Returns the number of words in the Trie
   */
  get length(): number {
    return this.size;
  }

  /**
   * Clears all words from the Trie
   */
  clear(): void {
    this.root = this.createNode();
    this.size = 0;
  }

  /**
   * Gets all words in the Trie
   */
  getAllWords(): Array<{ word: string; data: T }> {
    const results: TrieSearchResult<T>[] = [];
    this.collectWords(this.root, '', results, Number.MAX_SAFE_INTEGER);
    return results.map(({ word, data }) => ({ word, data }));
  }

  // ============================================
  // Private Helpers
  // ============================================

  private findNode(word: string): TrieNode<T> | null {
    const normalizedWord = this.normalizeKey(word.trim());
    if (!normalizedWord) return null;

    let current = this.root;
    for (const char of normalizedWord) {
      const next = current.children.get(char);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  private collectWords(
    node: TrieNode<T>,
    currentWord: string,
    results: TrieSearchResult<T>[],
    limit: number,
  ): void {
    if (results.length >= limit) return;

    if (node.isEndOfWord && node.data !== null) {
      results.push({ word: currentWord, data: node.data, score: node.frequency });
    }

    for (const [char, childNode] of node.children) {
      this.collectWords(childNode, currentWord + char, results, limit);
    }
  }

  private deleteRecursive(node: TrieNode<T>, word: string, index: number): boolean {
    if (index === word.length) {
      if (!node.isEndOfWord) return false;
      node.isEndOfWord = false;
      node.data = null;
      this.size--;
      return node.children.size === 0;
    }

    const char = word[index];
    if (char === undefined) return false;

    const childNode = node.children.get(char);
    if (!childNode) return false;

    const shouldDeleteChild = this.deleteRecursive(childNode, word, index + 1);

    if (shouldDeleteChild) {
      node.children.delete(char);
      return !node.isEndOfWord && node.children.size === 0;
    }

    childNode.frequency--;
    return false;
  }
}

// ============================================
// Rabin-Karp string search
// ============================================

/**
 * Finds all occurrences of a pattern in text using the Rabin-Karp rolling hash algorithm.
 *
 * @param text - The text to search in
 * @param pattern - The pattern to search for
 * @returns Array of starting indices where the pattern is found
 */
export function rabinKarp(text: string, pattern: string): number[] {
  const n = text.length;
  const m = pattern.length;
  const matches: number[] = [];
  if (m > n || m === 0) return matches;

  const BASE = 31;
  const MOD = 1_000_000_007;
  const pow = Array.from({ length: m }, () => 0);
  pow[0] = 1;
  for (let i = 1; i < m; i++) pow[i] = (pow[i - 1]! * BASE) % MOD;

  const cv = (s: string, i: number) => s.charCodeAt(i) - 96;

  let patHash = 0;
  let winHash = 0;
  for (let i = 0; i < m; i++) {
    patHash = (patHash + cv(pattern, i) * pow[m - 1 - i]!) % MOD;
    winHash = (winHash + cv(text, i) * pow[m - 1 - i]!) % MOD;
  }
  if (winHash === patHash && text.slice(0, m) === pattern) matches.push(0);

  for (let i = 1; i <= n - m; i++) {
    winHash = (winHash - (cv(text, i - 1) * pow[m - 1]!) % MOD + MOD) % MOD;
    winHash = (winHash * BASE + cv(text, i + m - 1)) % MOD;
    if (winHash === patHash && text.slice(i, i + m) === pattern) matches.push(i);
  }
  return matches;
}
