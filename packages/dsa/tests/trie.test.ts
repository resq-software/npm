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

import { beforeEach, describe, expect, it } from 'vitest';
import { Trie, rabinKarp } from '../src/trie.js';

interface TestData {
  id: string;
  name: string;
}

describe('Trie', () => {
  let trie: Trie<TestData>;

  beforeEach(() => {
    trie = new Trie<TestData>();
  });

  describe('constructor', () => {
    it('creates an empty trie', () => {
      expect(trie.length).toBe(0);
    });

    it('accepts custom options', () => {
      const t = new Trie<string>({ caseInsensitive: false, maxResults: 5 });
      expect(t.length).toBe(0);
    });

    it('throws for invalid maxResults', () => {
      expect(() => new Trie<string>({ maxResults: -1 })).toThrow();
      expect(() => new Trie<string>({ maxResults: 0 })).toThrow();
    });
  });

  describe('insert', () => {
    it('inserts a word with data', () => {
      trie.insert('drone', { id: '1', name: 'Drone' });
      expect(trie.length).toBe(1);
    });

    it('silently skips empty string', () => {
      trie.insert('', { id: '1', name: 'test' });
      expect(trie.length).toBe(0);
    });

    it('silently skips whitespace-only string', () => {
      trie.insert('   ', { id: '1', name: 'test' });
      expect(trie.length).toBe(0);
    });

    it('supports method chaining', () => {
      const result = trie
        .insert('foo', { id: '1', name: 'Foo' })
        .insert('bar', { id: '2', name: 'Bar' });
      expect(result).toBe(trie);
      expect(trie.length).toBe(2);
    });

    it('updates data for existing word', () => {
      trie.insert('foo', { id: '1', name: 'Foo' });
      trie.insert('foo', { id: '2', name: 'Foo Updated' });
      expect(trie.length).toBe(1);
      expect(trie.search('foo')?.id).toBe('2');
    });
  });

  describe('insertMany', () => {
    it('inserts multiple entries', () => {
      trie.insertMany([
        ['alpha', { id: '1', name: 'Alpha' }],
        ['beta', { id: '2', name: 'Beta' }],
        ['gamma', { id: '3', name: 'Gamma' }],
      ]);
      expect(trie.length).toBe(3);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      trie.insert('drone', { id: '1', name: 'Drone' });
      trie.insert('droning', { id: '2', name: 'Droning' });
    });

    it('returns data for exact match', () => {
      expect(trie.search('drone')?.id).toBe('1');
    });

    it('returns null for prefix-only match', () => {
      expect(trie.search('dron')).toBeNull();
    });

    it('returns null for non-existent word', () => {
      expect(trie.search('alert')).toBeNull();
    });

    it('is case-insensitive by default', () => {
      expect(trie.search('DRONE')?.id).toBe('1');
    });
  });

  describe('has', () => {
    beforeEach(() => {
      trie.insert('alert', { id: '1', name: 'Alert' });
    });

    it('returns true for existing word', () => {
      expect(trie.has('alert')).toBe(true);
    });

    it('returns false for non-existent word', () => {
      expect(trie.has('alarm')).toBe(false);
    });

    it('is case-insensitive by default', () => {
      expect(trie.has('ALERT')).toBe(true);
    });
  });

  describe('startsWith', () => {
    beforeEach(() => {
      trie.insert('alert', { id: '1', name: 'Alert' });
      trie.insert('alerting', { id: '2', name: 'Alerting' });
    });

    it('returns true for valid prefix', () => {
      expect(trie.startsWith('al')).toBe(true);
      expect(trie.startsWith('alert')).toBe(true);
    });

    it('returns false for non-matching prefix', () => {
      expect(trie.startsWith('xyz')).toBe(false);
    });
  });

  describe('searchByPrefix', () => {
    beforeEach(() => {
      trie.insert('alert', { id: '1', name: 'Alert' });
      trie.insert('alerting', { id: '2', name: 'Alerting' });
      trie.insert('alarm', { id: '3', name: 'Alarm' });
      trie.insert('base', { id: '4', name: 'Base' });
    });

    it('returns all words matching prefix', () => {
      const results = trie.searchByPrefix('al');
      expect(results.length).toBe(3);
    });

    it('respects limit parameter', () => {
      expect(trie.searchByPrefix('al', 2).length).toBe(2);
    });

    it('returns empty for unknown prefix', () => {
      expect(trie.searchByPrefix('xyz').length).toBe(0);
    });

    it('returns empty for empty prefix', () => {
      expect(trie.searchByPrefix('').length).toBe(0);
    });

    it('results have word, data, and score properties', () => {
      const results = trie.searchByPrefix('al');
      for (const r of results) {
        expect(r).toHaveProperty('word');
        expect(r).toHaveProperty('data');
        expect(r).toHaveProperty('score');
        expect(typeof r.score).toBe('number');
      }
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      trie.insert('foo', { id: '1', name: 'Foo' });
      trie.insert('foobar', { id: '2', name: 'Foobar' });
    });

    it('deletes a word', () => {
      trie.delete('foo');
      expect(trie.length).toBe(1);
      expect(trie.search('foo')).toBeNull();
    });

    it('returns false for non-existent word', () => {
      expect(trie.delete('baz')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(trie.delete('')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all words', () => {
      trie.insert('foo', { id: '1', name: 'Foo' });
      trie.clear();
      expect(trie.length).toBe(0);
      expect(trie.has('foo')).toBe(false);
    });
  });

  describe('getAllWords', () => {
    it('returns all inserted words', () => {
      trie.insert('alpha', { id: '1', name: 'Alpha' });
      trie.insert('beta', { id: '2', name: 'Beta' });
      const words = trie.getAllWords();
      expect(words.length).toBe(2);
    });
  });

  describe('case sensitivity', () => {
    it('is case-insensitive by default', () => {
      trie.insert('Drone', { id: '1', name: 'Drone' });
      expect(trie.search('drone')).not.toBeNull();
      expect(trie.search('DRONE')).not.toBeNull();
    });

    it('is case-sensitive when configured', () => {
      const cs = new Trie<TestData>({ caseInsensitive: false });
      cs.insert('Drone', { id: '1', name: 'Drone' });
      expect(cs.search('Drone')).not.toBeNull();
      expect(cs.search('drone')).toBeNull();
    });
  });
});

describe('rabinKarp', () => {
  it('finds single match', () => {
    expect(rabinKarp('hello world', 'world')).toEqual([6]);
  });

  it('finds multiple matches', () => {
    expect(rabinKarp('ababab', 'ab')).toEqual([0, 2, 4]);
  });

  it('returns empty for no match', () => {
    expect(rabinKarp('hello', 'xyz')).toEqual([]);
  });

  it('handles pattern longer than text', () => {
    expect(rabinKarp('hi', 'hello')).toEqual([]);
  });
});
