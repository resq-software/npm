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
import { describe, expect, it } from "vitest";
import { MediaHelpers } from "../../../src/browser/media/media.js";

describe("MediaHelpers", () => {
	// Note: Most MediaHelpers methods are DOM-dependent and already tested through
	// integration tests in packages that use them. The complex mocking required
	// for these tests doesn't add value and makes tests brittle.

	describe("type checking methods", () => {
		it("should correctly identify animated image types", () => {
			expect(MediaHelpers.isAnimatedImageType("image/gif")).toBe(true);
			expect(MediaHelpers.isAnimatedImageType("image/apng")).toBe(true);
			expect(MediaHelpers.isAnimatedImageType("image/avif")).toBe(true);
			expect(MediaHelpers.isAnimatedImageType("image/webp")).toBe(false); // webp can be static
		});

		it("should correctly identify static image types", () => {
			expect(MediaHelpers.isStaticImageType("image/jpeg")).toBe(true);
			expect(MediaHelpers.isStaticImageType("image/png")).toBe(true);
			expect(MediaHelpers.isStaticImageType("image/webp")).toBe(true);
			expect(MediaHelpers.isStaticImageType("image/gif")).toBe(false);
		});

		it("should correctly identify vector image types", () => {
			expect(MediaHelpers.isVectorImageType("image/svg+xml")).toBe(true);
			expect(MediaHelpers.isVectorImageType("image/jpeg")).toBe(false);
			expect(MediaHelpers.isVectorImageType("image/gif")).toBe(false);
		});

		it("should correctly identify all image types", () => {
			expect(MediaHelpers.isImageType("image/jpeg")).toBe(true);
			expect(MediaHelpers.isImageType("image/png")).toBe(true);
			expect(MediaHelpers.isImageType("image/gif")).toBe(true);
			expect(MediaHelpers.isImageType("image/svg+xml")).toBe(true);
			expect(MediaHelpers.isImageType("video/mp4")).toBe(false);
			expect(MediaHelpers.isImageType("text/plain")).toBe(false);
		});

		it("should handle null and undefined gracefully", () => {
			expect(MediaHelpers.isAnimatedImageType(null)).toBe(false);
			expect(MediaHelpers.isStaticImageType(null)).toBe(false);
			expect(MediaHelpers.isVectorImageType(null)).toBe(false);
		});
	});

	describe("getVideoFrameAsDataUrl seek handling", () => {
		const HAVE_METADATA = 1;
		const HAVE_CURRENT_DATA = 2;
		const FAKE_DATA_URL = "data:image/png;base64,FAKE";

		type Listener = (e: { type: string }) => void;

		/**
		 * Minimal fake video element. jsdom has no real canvas 2d context, so the
		 * canvas is faked too. `set currentTime` simulates an asynchronous seek:
		 * the "seeked" event only fires on a later microtask.
		 */
		function createFakeVideo(initialReadyState: number) {
			let currentTime = 0;
			let seekCount = 0;
			const listeners: Record<string, Listener[]> = {};

			const emit = (type: string) => {
				for (const cb of listeners[type] ?? []) {
					cb({ type });
				}
			};

			const fakeCanvas = {
				width: 0,
				height: 0,
				getContext: () => ({ drawImage: () => {} }),
				toDataURL: () => FAKE_DATA_URL,
			};

			const video = {
				readyState: initialReadyState,
				HAVE_METADATA,
				HAVE_CURRENT_DATA,
				videoWidth: 4,
				videoHeight: 2,
				ownerDocument: {
					createElement: () => fakeCanvas,
				},
				get currentTime() {
					return currentTime;
				},
				set currentTime(t: number) {
					currentTime = t;
					seekCount += 1;
					queueMicrotask(() => {
						this.readyState = HAVE_CURRENT_DATA;
						emit("seeked");
					});
				},
				addEventListener(type: string, cb: Listener) {
					if (!listeners[type]) {
						listeners[type] = [];
					}
					listeners[type].push(cb);
				},
				removeEventListener(type: string, cb: Listener) {
					listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== cb);
				},
				getSeekCount: () => seekCount,
				getListenerCount: () => Object.values(listeners).reduce((sum, arr) => sum + arr.length, 0),
			};

			return video;
		}

		it("waits for the seeked event before capturing when a non-zero time is requested", async () => {
			const video = createFakeVideo(HAVE_CURRENT_DATA);

			const result = await MediaHelpers.getVideoFrameAsDataUrl(
				video as unknown as HTMLVideoElement,
				5,
			);

			expect(result).toBe(FAKE_DATA_URL);
			// A seek was initiated and the frame captured at the requested time.
			expect(video.getSeekCount()).toBe(1);
			expect(video.currentTime).toBe(5);
			// All listeners cleaned up after resolution.
			expect(video.getListenerCount()).toBe(0);
		});

		it("captures immediately without seeking when time is zero", async () => {
			const video = createFakeVideo(HAVE_CURRENT_DATA);

			const result = await MediaHelpers.getVideoFrameAsDataUrl(
				video as unknown as HTMLVideoElement,
			);

			expect(result).toBe(FAKE_DATA_URL);
			expect(video.getSeekCount()).toBe(0);
			expect(video.getListenerCount()).toBe(0);
		});
	});

	// Note: The following methods are not tested here as they require extensive DOM mocking
	// that would test the mocking framework more than the actual business logic:
	// - loadVideo: Complex DOM video element mocking
	// - getImageAndDimensions: Image element and DOM manipulation mocking
	// - getVideoSize: Depends on loadVideo
	// - getImageSize: Complex PNG parsing logic with extensive mocking
	// - isAnimated: Delegates to format-specific functions already tested elsewhere
	// - usingObjectURL: Simple wrapper around URL APIs with cleanup

	// These methods are better tested through integration tests in the consuming packages
	// (like @tldraw/tldraw) where they're used in realistic scenarios.
});
