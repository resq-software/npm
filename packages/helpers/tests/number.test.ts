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
import { formatNumber, formatBytes, formatPercent } from '../src/formatting/number.js';

describe('formatNumber', () => {
  test('formats a small integer', () => {
    expect(formatNumber(42)).toBe('42');
  });

  test('formats a large number with commas', () => {
    expect(formatNumber(1_000_000)).toBe('1,000,000');
  });

  test('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  test('formats negative numbers', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  test('formats decimal numbers', () => {
    const result = formatNumber(1234.56);
    expect(result).toBe('1,234.56');
  });
});

describe('formatBytes', () => {
  test('returns "0 Bytes" for zero', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  test('formats bytes under 1 KB', () => {
    expect(formatBytes(512)).toBe('512 Bytes');
  });

  test('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  test('formats megabytes', () => {
    expect(formatBytes(1_048_576)).toBe('1 MB');
  });

  test('formats gigabytes', () => {
    expect(formatBytes(1_073_741_824)).toBe('1 GB');
  });

  test('formats terabytes', () => {
    expect(formatBytes(1_099_511_627_776)).toBe('1 TB');
  });

  test('rounds to two decimal places', () => {
    // 1.5 KB = 1536 bytes
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  test('handles fractional megabytes', () => {
    // 2.5 MB = 2621440 bytes
    expect(formatBytes(2_621_440)).toBe('2.5 MB');
  });
});

describe('formatPercent', () => {
  test('formats 0.5 as 50.0%', () => {
    expect(formatPercent(0.5)).toBe('50.0%');
  });

  test('formats 1 as 100.0%', () => {
    expect(formatPercent(1)).toBe('100.0%');
  });

  test('formats 0 as 0.0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  test('formats fractional values', () => {
    expect(formatPercent(0.123)).toBe('12.3%');
  });

  test('formats values greater than 1', () => {
    expect(formatPercent(1.5)).toBe('150.0%');
  });

  test('formats negative values', () => {
    expect(formatPercent(-0.1)).toBe('-10.0%');
  });
});
