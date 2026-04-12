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
import { parseCodePath, parseCodePathDetailed } from '../src/parse-code-path.js';

describe('parseCodePath', () => {
  test('formats output with function name', () => {
    function myFunction() {}
    const result = parseCodePath('init', myFunction);
    expect(result).toContain('@myFunction: init');
    expect(result).toMatch(/^location:/);
  });

  test('formats output with class name', () => {
    class MyClass {}
    const result = parseCodePath('startup', MyClass);
    expect(result).toContain('@MyClass: startup');
  });

  test('formats output with string entity', () => {
    const result = parseCodePath('some context', 'EntityName');
    expect(result).toContain('@EntityName: some context');
  });

  test('handles anonymous function', () => {
    const result = parseCodePath('ctx', () => {});
    expect(result).toContain('@');
  });

  test('handles symbol entity', () => {
    const result = parseCodePath('ctx', Symbol('test'));
    expect(result).toContain('Symbol(test)');
  });

  test('handles null entity', () => {
    const result = parseCodePath('ctx', null);
    expect(result).toContain('@UnknownEntity');
  });

  test('handles object instance', () => {
    class Foo {}
    const instance = new Foo();
    const result = parseCodePath('ctx', instance);
    expect(result).toContain('@Foo');
  });
});

describe('parseCodePathDetailed', () => {
  test('uses custom prefix', () => {
    function handler() {}
    const result = parseCodePathDetailed('init', handler, {
      customPrefix: 'trace',
    });
    expect(result).toMatch(/^trace:/);
    expect(result).toContain('@handler: init');
  });

  test('includes timestamp when requested', () => {
    const result = parseCodePathDetailed('ctx', 'Entity', {
      includeTimestamp: true,
    });
    // ISO timestamp pattern: [2024-...]
    expect(result).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  test('defaults to "location" prefix', () => {
    const result = parseCodePathDetailed('ctx', 'Test');
    expect(result).toMatch(/^location:/);
  });
});
