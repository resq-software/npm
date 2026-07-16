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
/* eslint-disable tldraw/no-direct-storage */

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

describe("storage", () => {
	// Store original implementations
	const originalLocalStorage = global.localStorage;
	const originalSessionStorage = global.sessionStorage;

	beforeEach(() => {
		// Mock localStorage
		const localStorageMock = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		};
		global.localStorage = localStorageMock as any;

		// Mock sessionStorage
		const sessionStorageMock = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		};
		global.sessionStorage = sessionStorageMock as any;
	});

	afterEach(() => {
		// Restore original implementations
		global.localStorage = originalLocalStorage;
		global.sessionStorage = originalSessionStorage;
		vi.clearAllMocks();
	});

	describe("getFromLocalStorage", () => {
		it("should return null when localStorage.getItem throws an error", () => {
			(localStorage.getItem as any).mockImplementation(() => {
				throw new Error("Storage not available");
			});

			const result = getFromLocalStorage("test-key");

			expect(result).toBe(null);
		});
	});

	describe("setInLocalStorage", () => {
		it("should not throw when localStorage.setItem throws an error", () => {
			(localStorage.setItem as any).mockImplementation(() => {
				throw new Error("Quota exceeded");
			});

			expect(() => setInLocalStorage("test-key", "test-value")).not.toThrow();
		});
	});

	describe("deleteFromLocalStorage", () => {
		it("should not throw when localStorage.removeItem throws an error", () => {
			(localStorage.removeItem as any).mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => deleteFromLocalStorage("test-key")).not.toThrow();
		});
	});

	describe("clearLocalStorage", () => {
		it("should not throw when localStorage.clear throws an error", () => {
			(localStorage.clear as any).mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => clearLocalStorage()).not.toThrow();
		});
	});

	describe("getFromSessionStorage", () => {
		it("should return null when sessionStorage.getItem throws an error", () => {
			(sessionStorage.getItem as any).mockImplementation(() => {
				throw new Error("Storage not available");
			});

			const result = getFromSessionStorage("session-key");

			expect(result).toBe(null);
		});
	});

	describe("setInSessionStorage", () => {
		it("should not throw when sessionStorage.setItem throws an error", () => {
			(sessionStorage.setItem as any).mockImplementation(() => {
				throw new Error("Quota exceeded");
			});

			expect(() => setInSessionStorage("session-key", "session-value")).not.toThrow();
		});
	});

	describe("deleteFromSessionStorage", () => {
		it("should not throw when sessionStorage.removeItem throws an error", () => {
			(sessionStorage.removeItem as any).mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => deleteFromSessionStorage("session-key")).not.toThrow();
		});
	});

	describe("clearSessionStorage", () => {
		it("should not throw when sessionStorage.clear throws an error", () => {
			(sessionStorage.clear as any).mockImplementation(() => {
				throw new Error("Storage not available");
			});

			expect(() => clearSessionStorage()).not.toThrow();
		});
	});
});
