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

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearLocalStorage,
	clearSessionStorage,
	deleteFromLocalStorage,
	deleteFromSessionStorage,
	getFromLocalStorage,
	getFromSessionStorage,
	setInLocalStorage,
	setInSessionStorage,
} from "../../src/browser/storage.js";

/**
 * Build a `Storage` stand-in whose methods are Vitest mocks. Returning the mock
 * object (rather than reaching for `localStorage.getItem` after the fact) is what
 * keeps the per-test `mockImplementation` calls fully typed.
 */
function createStorageMock() {
	return {
		getItem: vi.fn<(key: string) => string | null>(),
		setItem: vi.fn<(key: string, value: string) => void>(),
		removeItem: vi.fn<(key: string) => void>(),
		clear: vi.fn<() => void>(),
		key: vi.fn<(index: number) => string | null>(),
		length: 0,
	} satisfies Storage;
}

describe("storage", () => {
	// Store original implementations
	const originalLocalStorage = global.localStorage;
	const originalSessionStorage = global.sessionStorage;

	let localStorageMock: ReturnType<typeof createStorageMock>;
	let sessionStorageMock: ReturnType<typeof createStorageMock>;

	beforeEach(() => {
		localStorageMock = createStorageMock();
		global.localStorage = localStorageMock;

		sessionStorageMock = createStorageMock();
		global.sessionStorage = sessionStorageMock;
	});

	afterEach(() => {
		// Restore original implementations
		global.localStorage = originalLocalStorage;
		global.sessionStorage = originalSessionStorage;
		vi.clearAllMocks();
	});

	describe("getFromLocalStorage", () => {
		it("should return null when localStorage.getItem throws an error", () => {
			localStorageMock.getItem.mockImplementation(() => {
				throw new Error("Storage not available");
			});

			const result = getFromLocalStorage("test-key");

			expect(result).toBe(null);
		});
	});

	describe("setInLocalStorage", () => {
		it("should not throw when localStorage.setItem throws an error", () => {
			localStorageMock.setItem.mockImplementation(() => {
				throw new Error("Quota exceeded");
			});

			expect(() => setInLocalStorage("test-key", "test-value")).not.toThrow();
		});
	});

	describe("deleteFromLocalStorage", () => {
		it("should not throw when localStorage.removeItem throws an error", () => {
			localStorageMock.removeItem.mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => deleteFromLocalStorage("test-key")).not.toThrow();
		});
	});

	describe("clearLocalStorage", () => {
		it("should not throw when localStorage.clear throws an error", () => {
			localStorageMock.clear.mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => clearLocalStorage()).not.toThrow();
		});
	});

	describe("getFromSessionStorage", () => {
		it("should return null when sessionStorage.getItem throws an error", () => {
			sessionStorageMock.getItem.mockImplementation(() => {
				throw new Error("Storage not available");
			});

			const result = getFromSessionStorage("session-key");

			expect(result).toBe(null);
		});
	});

	describe("setInSessionStorage", () => {
		it("should not throw when sessionStorage.setItem throws an error", () => {
			sessionStorageMock.setItem.mockImplementation(() => {
				throw new Error("Quota exceeded");
			});

			expect(() => setInSessionStorage("session-key", "session-value")).not.toThrow();
		});
	});

	describe("deleteFromSessionStorage", () => {
		it("should not throw when sessionStorage.removeItem throws an error", () => {
			sessionStorageMock.removeItem.mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => deleteFromSessionStorage("session-key")).not.toThrow();
		});
	});

	describe("clearSessionStorage", () => {
		it("should not throw when sessionStorage.clear throws an error", () => {
			sessionStorageMock.clear.mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => clearSessionStorage()).not.toThrow();
		});
	});
});
