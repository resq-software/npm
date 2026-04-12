// @vitest-environment jsdom

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

import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import {
  isIOS,
  isAndroid,
  isMacOS,
  isWindows,
  isChromeOS,
  getBrowser,
  getPlatform,
  isTouchScreen,
  isChrome,
  isFirefox,
  isSafari,
  isEdge,
  isOpera,
  isIOSSafari,
  isAndroidChrome,
  isMacOSChrome,
  isWindowsChrome,
} from '../src/browser/platform.js';

/** Helper to mock navigator.userAgent and window globals. */
function mockUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    writable: true,
    configurable: true,
  });
}

describe('platform detection', () => {
  let originalUA: string;
  let originalMSStream: unknown;
  let originalMaxTouchPoints: number;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalUA = navigator.userAgent;
    originalMSStream = (globalThis.window as any).MSStream;
    originalMaxTouchPoints = navigator.maxTouchPoints;
    originalMatchMedia = globalThis.window.matchMedia;

    // Default: no MSStream, no touch
    (globalThis.window as any).MSStream = undefined;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
  });

  afterEach(() => {
    mockUserAgent(originalUA);
    (globalThis.window as any).MSStream = originalMSStream;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      writable: true,
      configurable: true,
    });
    globalThis.window.matchMedia = originalMatchMedia;
  });

  describe('isIOS', () => {
    test('returns true for iPhone user agent', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');
      expect(isIOS()).toBe(true);
    });

    test('returns true for iPad user agent', () => {
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)');
      expect(isIOS()).toBe(true);
    });

    test('returns false when MSStream is present (IE on Windows Phone)', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');
      (globalThis.window as any).MSStream = {};
      expect(isIOS()).toBe(false);
    });

    test('returns false for Android user agent', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 13)');
      expect(isIOS()).toBe(false);
    });
  });

  describe('isAndroid', () => {
    test('returns true for Android user agent', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7)');
      expect(isAndroid()).toBe(true);
    });

    test('returns false for desktop user agent', () => {
      mockUserAgent('Mozilla/5.0 (X11; Linux x86_64)');
      expect(isAndroid()).toBe(false);
    });
  });

  describe('isMacOS', () => {
    test('returns true for Macintosh user agent', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(isMacOS()).toBe(true);
    });
  });

  describe('isWindows', () => {
    test('returns true for Windows NT user agent', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(isWindows()).toBe(true);
    });
  });

  describe('isChromeOS', () => {
    test('returns true for CrOS user agent', () => {
      mockUserAgent('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)');
      expect(isChromeOS()).toBe(true);
    });

    test('returns false for Linux user agent', () => {
      mockUserAgent('Mozilla/5.0 (X11; Linux x86_64)');
      expect(isChromeOS()).toBe(false);
    });
  });

  describe('getBrowser', () => {
    test('detects Edge', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Edg/120.0');
      expect(getBrowser()).toBe('edge');
    });

    test('detects Chrome', () => {
      mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36');
      expect(getBrowser()).toBe('chrome');
    });

    test('detects Firefox', () => {
      mockUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Firefox/120.0');
      expect(getBrowser()).toBe('firefox');
    });

    test('detects Safari', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15');
      expect(getBrowser()).toBe('safari');
    });

    test('returns unknown for unrecognized UA', () => {
      mockUserAgent('SomeBotCrawler/1.0');
      expect(getBrowser()).toBe('unknown');
    });
  });

  describe('getPlatform', () => {
    test('returns ios for iPhone', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');
      expect(getPlatform()).toBe('ios');
    });

    test('returns android for Android device', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7)');
      expect(getPlatform()).toBe('android');
    });

    test('returns macos for Macintosh', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(getPlatform()).toBe('macos');
    });

    test('returns windows for Windows NT', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(getPlatform()).toBe('windows');
    });

    test('returns chromeos for CrOS', () => {
      mockUserAgent('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)');
      expect(getPlatform()).toBe('chromeos');
    });

    test('returns unknown for unrecognized UA', () => {
      mockUserAgent('SomeBotCrawler/1.0');
      expect(getPlatform()).toBe('unknown');
    });
  });

  describe('isTouchScreen', () => {
    test('returns true when maxTouchPoints > 0', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        writable: true,
        configurable: true,
      });
      expect(isTouchScreen()).toBe(true);
    });

    test('returns true when matchMedia reports coarse pointer', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        writable: true,
        configurable: true,
      });
      globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any;
      expect(isTouchScreen()).toBe(true);
    });

    test('returns false when no touch capability', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        writable: true,
        configurable: true,
      });
      globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
      expect(isTouchScreen()).toBe(false);
    });
  });

  describe('browser shorthand helpers', () => {
    test('isChrome returns true for Chrome UA', () => {
      mockUserAgent('Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36');
      expect(isChrome()).toBe(true);
    });

    test('isFirefox returns true for Firefox UA', () => {
      mockUserAgent('Mozilla/5.0 Firefox/120.0');
      expect(isFirefox()).toBe(true);
    });

    test('isSafari returns true for Safari UA', () => {
      mockUserAgent('Mozilla/5.0 AppleWebKit/605.1.15 Safari/605.1.15');
      expect(isSafari()).toBe(true);
    });

    test('isEdge returns true for Edge UA', () => {
      mockUserAgent('Mozilla/5.0 Edg/120.0');
      expect(isEdge()).toBe(true);
    });
  });

  describe('composite platform+browser helpers', () => {
    test('isAndroidChrome detects Chrome on Android', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 13) Chrome/120.0 Safari/537.36');
      expect(isAndroidChrome()).toBe(true);
    });

    test('isMacOSChrome detects Chrome on macOS', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0 Safari/537.36');
      expect(isMacOSChrome()).toBe(true);
    });

    test('isWindowsChrome detects Chrome on Windows', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36');
      expect(isWindowsChrome()).toBe(true);
    });
  });
});
