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

import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import { getURL } from '../src/helpers.js';

describe("getURL", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe("Browser Environment", () => {
    test("returns origin when path is empty", () => {
        const origin = "https://example.com";
        const originalLocation = globalThis.location;

        // Mock location
        Object.defineProperty(globalThis, "location", {
            value: { origin },
            writable: true,
            configurable: true,
        });

        expect(getURL()).toBe(origin);

        // Cleanup
        if (originalLocation) {
            globalThis.location = originalLocation;
        } else {
            // @ts-ignore
            delete globalThis.location;
        }
    });

    test("appends path correctly", () => {
        const origin = "https://example.com";
        const originalLocation = globalThis.location;
        Object.defineProperty(globalThis, "location", {
            value: { origin },
            writable: true,
            configurable: true,
        });

        expect(getURL("path")).toBe(`${origin}/path`);
        expect(getURL("/path")).toBe(`${origin}/path`); // Handles leading slash

        // Cleanup
        if (originalLocation) {
            globalThis.location = originalLocation;
        } else {
            // @ts-ignore
            delete globalThis.location;
        }
    });

    test("handles base URL with trailing slash", () => {
        const origin = "https://example.com/";
        const originalLocation = globalThis.location;
        Object.defineProperty(globalThis, "location", {
            value: { origin },
            writable: true,
            configurable: true,
        });

        expect(getURL("path")).toBe("https://example.com/path");

        // Cleanup
        if (originalLocation) {
            globalThis.location = originalLocation;
        } else {
            // @ts-ignore
            delete globalThis.location;
        }
    });
  });

  describe("Server Environment (No Global Location)", () => {
    test("uses VITE_BASE_URL if defined", () => {
        // Ensure location is undefined
        const originalLocation = globalThis.location;
        // @ts-ignore
        delete globalThis.location;

        process.env.VITE_BASE_URL = "https://vite.example.com";

        // Note: Current implementation might fail this expectation if path logic is broken
        // But we expect this behavior after fix.
        expect(getURL("api")).toBe("https://vite.example.com/api");

        delete process.env.VITE_BASE_URL;
        // Restore location
        if (originalLocation) globalThis.location = originalLocation;
    });

    test("uses NEXT_PUBLIC_BASE_URL if defined", () => {
        const originalLocation = globalThis.location;
        // @ts-ignore
        delete globalThis.location;

        process.env.NEXT_PUBLIC_BASE_URL = "https://next.example.com";

        expect(getURL("api")).toBe("https://next.example.com/api");

        delete process.env.NEXT_PUBLIC_BASE_URL;
        if (originalLocation) globalThis.location = originalLocation;
    });

    test("uses BASE_URL if defined", () => {
        const originalLocation = globalThis.location;
        // @ts-ignore
        delete globalThis.location;

        process.env.BASE_URL = "https://base.example.com";

        expect(getURL("api")).toBe("https://base.example.com/api");

        delete process.env.BASE_URL;
        if (originalLocation) globalThis.location = originalLocation;
    });

    test("returns empty string and warns if no env var found", () => {
        const originalLocation = globalThis.location;
        // @ts-ignore
        delete globalThis.location;

        // Ensure no env vars
        const oldVite = process.env.VITE_BASE_URL;
        const oldNext = process.env.NEXT_PUBLIC_BASE_URL;
        const oldBase = process.env.BASE_URL;
        delete process.env.VITE_BASE_URL;
        delete process.env.NEXT_PUBLIC_BASE_URL;
        delete process.env.BASE_URL;

        expect(getURL()).toBe("");
        expect(warnSpy).toHaveBeenCalled();

        // Restore
        if (oldVite) process.env.VITE_BASE_URL = oldVite;
        if (oldNext) process.env.NEXT_PUBLIC_BASE_URL = oldNext;
        if (oldBase) process.env.BASE_URL = oldBase;
        if (originalLocation) globalThis.location = originalLocation;
    });
  });
});
