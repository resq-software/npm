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
import { obfuscateLink } from '../src/browser/html-entities.js';

describe('obfuscateLink', () => {
  describe('mailto scheme', () => {
    test('returns encoded text matching the address when no text is provided', () => {
      const result = obfuscateLink({ scheme: 'mailto', address: 'a@b.c' });
      expect(result.encodedText).toBe('&#97;&#64;&#98;&#46;&#99;');
    });

    test('builds a mailto href without params', () => {
      const result = obfuscateLink({ scheme: 'mailto', address: 'jane@example.com' });
      expect(result.href).toBe('mailto:jane@example.com');
    });

    test('appends query params to the mailto href', () => {
      const result = obfuscateLink({
        scheme: 'mailto',
        address: 'jane@example.com',
        params: { subject: 'Hello World', body: 'Hi there' },
      });
      expect(result.href).toBe(
        'mailto:jane@example.com?subject=Hello%20World&body=Hi%20there',
      );
    });

    test('uses custom text when provided', () => {
      const result = obfuscateLink({
        scheme: 'mailto',
        address: 'jane@example.com',
        text: 'Contact',
      });
      // "Contact" => &#67;&#111;&#110;&#116;&#97;&#99;&#116;
      expect(result.encodedText).toBe('&#67;&#111;&#110;&#116;&#97;&#99;&#116;');
    });

    test('ignores empty params object', () => {
      const result = obfuscateLink({
        scheme: 'mailto',
        address: 'x@y.z',
        params: {},
      });
      expect(result.href).toBe('mailto:x@y.z');
    });
  });

  describe('tel scheme', () => {
    test('builds a tel href', () => {
      const result = obfuscateLink({ scheme: 'tel', address: '+15551234567' });
      expect(result.href).toBe('tel:+15551234567');
    });

    test('encodes the phone number as entities when no text is provided', () => {
      const result = obfuscateLink({ scheme: 'tel', address: '123' });
      expect(result.encodedText).toBe('&#49;&#50;&#51;');
    });

    test('uses custom display text for tel links', () => {
      const result = obfuscateLink({
        scheme: 'tel',
        address: '+15551234567',
        text: 'Call us',
      });
      expect(result.encodedText).toContain('&#67;'); // 'C'
      expect(result.href).toBe('tel:+15551234567');
    });
  });

  describe('edge cases', () => {
    test('handles empty address', () => {
      const result = obfuscateLink({ scheme: 'mailto', address: '' });
      expect(result.href).toBe('mailto:');
      expect(result.encodedText).toBe('');
    });

    test('handles special characters in params', () => {
      const result = obfuscateLink({
        scheme: 'mailto',
        address: 'a@b.c',
        params: { subject: 'a&b=c' },
      });
      expect(result.href).toContain('subject=a%26b%3Dc');
    });

    test('encodes unicode text to decimal entities', () => {
      const result = obfuscateLink({
        scheme: 'mailto',
        address: 'test@test.com',
        text: '\u00e9', // é
      });
      expect(result.encodedText).toBe('&#233;');
    });

    test('handles single-character address', () => {
      const result = obfuscateLink({ scheme: 'mailto', address: 'x' });
      expect(result.encodedText).toBe('&#120;');
      expect(result.href).toBe('mailto:x');
    });

    test('handles multiple params', () => {
      const result = obfuscateLink({
        scheme: 'mailto',
        address: 'a@b.c',
        params: { cc: 'd@e.f', bcc: 'g@h.i' },
      });
      expect(result.href).toContain('cc=d%40e.f');
      expect(result.href).toContain('bcc=g%40h.i');
      expect(result.href).toContain('&');
    });
  });
});
