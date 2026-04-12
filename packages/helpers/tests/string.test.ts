/**
 * Copyright 2026 ResQ
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

import { describe, expect, test } from 'vitest';
import { capitalize, truncate, slugify } from '../src/formatting/string.js';

describe('capitalize', () => {
  test('capitalizes first letter of a lowercase word', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('leaves already capitalized strings unchanged', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  test('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  test('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  test('does not alter the rest of the string', () => {
    expect(capitalize('hELLO WORLD')).toBe('HELLO WORLD');
  });

  test('handles strings starting with a number', () => {
    expect(capitalize('1abc')).toBe('1abc');
  });
});

describe('truncate', () => {
  test('returns the string unchanged when shorter than limit', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  test('returns the string unchanged when exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  test('truncates and appends ellipsis when longer than limit', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  test('handles zero length', () => {
    expect(truncate('hello', 0)).toBe('...');
  });

  test('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  test('truncates at 1 character', () => {
    expect(truncate('abc', 1)).toBe('a...');
  });
});

describe('slugify', () => {
  test('converts a simple string to a slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  test('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  test('collapses multiple spaces into a single dash', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  test('handles already lowercase strings', () => {
    expect(slugify('foo bar')).toBe('foo-bar');
  });

  test('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  test('strips leading and embedded punctuation', () => {
    expect(slugify("it's a test!")).toBe('its-a-test');
  });

  test('handles mixed case with numbers', () => {
    expect(slugify('Item 42 Is Great')).toBe('item-42-is-great');
  });

  test('preserves underscores (\\w includes _)', () => {
    expect(slugify('hello_world')).toBe('hello_world');
  });
});
