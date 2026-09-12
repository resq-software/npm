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

	// `isAnimated` chooses a parser from the buffer's magic bytes. It used to choose
	// from `Blob.type`, a caller-supplied label, and was previously left untested on
	// the grounds that it "delegates to format-specific functions already tested
	// elsewhere" — but the delegation *choice* was the defect, and no test of a
	// parser could reach it. These fixtures are minimal but structurally valid: each
	// parser re-validates its own signature, so a fixture that only looked right
	// would answer `false` and prove nothing.
	describe("isAnimated", () => {
		const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

		function pngChunk(type: string, data: Uint8Array = new Uint8Array(0)): Uint8Array {
			const out = new Uint8Array(12 + data.length);
			new DataView(out.buffer).setUint32(0, data.length);
			out.set(ascii(type), 4);
			out.set(data, 8);
			return out;
		}

		function png(...chunks: readonly Uint8Array[]): Uint8Array {
			const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...chunks];
			const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
			let offset = 0;
			for (const part of parts) {
				out.set(part, offset);
				offset += part.length;
			}
			return out;
		}

		/** GIF89a with `frames` image descriptors; two or more means animated. */
		function gif(frames: number): Uint8Array {
			const bytes = [...ascii("GIF89a"), 1, 0, 1, 0, 0x00, 0, 0];
			for (let i = 0; i < frames; i++) {
				bytes.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00, 0x02, 0x01, 0x00, 0x00);
			}
			bytes.push(0x3b);
			return new Uint8Array(bytes);
		}

		/** Extended WebP; byte 20 holds the VP8X feature flags, 0x02 being ANIM. */
		function webp(animated: boolean): Uint8Array {
			const out = new Uint8Array(32);
			out.set(ascii("RIFF"), 0);
			new DataView(out.buffer).setUint32(4, 24, true);
			out.set(ascii("WEBP"), 8);
			out.set(ascii("VP8X"), 12);
			out[20] = animated ? 0x02 : 0x00;
			return out;
		}

		/** ISOBMFF `ftyp` box; the `avis` brand marks an image sequence. */
		function avif(brand: "avis" | "avif"): Uint8Array {
			const out = new Uint8Array(24);
			new DataView(out.buffer).setUint32(0, 24);
			out.set(ascii("ftyp"), 4);
			out.set(ascii(brand), 8);
			out.set(ascii("mif1"), 16);
			out.set(ascii(brand), 20);
			return out;
		}

		const APNG = png(
			pngChunk("IHDR", new Uint8Array(13)),
			pngChunk("acTL", new Uint8Array(8)),
			pngChunk("IDAT", new Uint8Array(10)),
			pngChunk("IEND"),
		);
		const STATIC_PNG = png(
			pngChunk("IHDR", new Uint8Array(13)),
			pngChunk("IDAT", new Uint8Array(10)),
			pngChunk("IEND"),
		);

		const blob = (bytes: Uint8Array, type: string) => new Blob([bytes], { type });

		it.each([
			["an animated GIF", gif(2), "image/gif"],
			["an animated WebP", webp(true), "image/webp"],
			["an animated AVIF", avif("avis"), "image/avif"],
			["an APNG", APNG, "image/apng"],
		])("detects %s under its own MIME type", async (_label, bytes, type) => {
			await expect(MediaHelpers.isAnimated(blob(bytes, type))).resolves.toBe(true);
		});

		it.each([
			["a single-frame GIF", gif(1), "image/gif"],
			["a static WebP", webp(false), "image/webp"],
			["a still AVIF", avif("avif"), "image/avif"],
			["a static PNG", STATIC_PNG, "image/apng"],
		])("reports %s as not animated", async (_label, bytes, type) => {
			await expect(MediaHelpers.isAnimated(blob(bytes, type))).resolves.toBe(false);
		});

		// APNG is stored and served as `image/png`; `image/apng` exists but is not
		// what a file picker reports, because browsers derive `File.type` from the
		// `.png` extension. Dispatching on the label missed the ordinary case.
		it.each(["image/png", "application/octet-stream", ""])(
			"detects an APNG labelled %o",
			async (type) => {
				await expect(MediaHelpers.isAnimated(blob(APNG, type))).resolves.toBe(true);
			},
		);

		// Renaming a file changed the answer, so any rule built on this — an upload
		// check refusing animation, say — was bypassed by changing the extension.
		it.each([
			["an animated GIF", gif(2), "image/webp"],
			["an animated WebP", webp(true), "image/gif"],
			["an animated AVIF", avif("avis"), "image/png"],
			["an APNG", APNG, "image/jpeg"],
		])("detects %s despite a mismatched %o label", async (_label, bytes, type) => {
			await expect(MediaHelpers.isAnimated(blob(bytes, type))).resolves.toBe(true);
		});

		it.each([
			["an unrecognised signature", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(10).fill(0)])],
			["a buffer shorter than any signature", new Uint8Array([1, 2, 3])],
			["an empty buffer", new Uint8Array(0)],
		])("reports %s as not animated", async (_label, bytes) => {
			await expect(MediaHelpers.isAnimated(blob(bytes, "image/gif"))).resolves.toBe(false);
		});

		// The answer comes from a header, so reading the whole file to produce it was an
		// O(n) read and an O(n) allocation for an O(1) question — on the main thread,
		// once per upload. These pin the byte count, not just the answer: a regression
		// there is invisible to every other assertion in this file.
		describe("bytes read", () => {
			const MB = 1024 * 1024;

			/** Run `body`, reporting how many blob bytes were materialized. */
			async function measure(body: () => Promise<boolean>) {
				const original = Blob.prototype.arrayBuffer;
				let bytes = 0;
				Blob.prototype.arrayBuffer = function measured(this: Blob) {
					bytes += this.size;
					return original.call(this);
				};
				try {
					return { answer: await body(), bytes };
				} finally {
					Blob.prototype.arrayBuffer = original;
				}
			}

			const padTo = (bytes: Uint8Array, size: number) => {
				const out = new Uint8Array(size);
				out.set(bytes, 0);
				return out;
			};

			it.each([
				[
					"a JPEG, never an animated container",
					padTo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 8 * MB),
					false,
				],
				["a static WebP, decided by its VP8X flag byte", padTo(webp(false), 8 * MB), false],
				["an animated WebP", padTo(webp(true), 8 * MB), true],
				["a static AVIF, decided by its ftyp box", padTo(avif("avif"), 8 * MB), false],
				["an animated AVIF", padTo(avif("avis"), 8 * MB), true],
			])("answers for %s without reading the whole 8MB file", async (_label, bytes, expected) => {
				const { answer, bytes: read } = await measure(() =>
					MediaHelpers.isAnimated(blob(bytes, "")),
				);
				expect(answer).toBe(expected);
				expect(read).toBeLessThan(MB);
			});

			// A negative can mean "not animated" or "the prefix ran out", and only PNG
			// and GIF can need the rest of the file to tell those apart. Getting this
			// wrong turns a real APNG into a static one, silently.
			it("still finds acTL sitting behind a 200KB colour profile", async () => {
				const buried = png(
					pngChunk("IHDR", new Uint8Array(13)),
					pngChunk("iCCP", new Uint8Array(200 * 1024)),
					pngChunk("acTL", new Uint8Array(8)),
					pngChunk("IDAT", new Uint8Array(10)),
					pngChunk("IEND"),
				);
				await expect(MediaHelpers.isAnimated(blob(buried, "image/png"))).resolves.toBe(true);
			});

			it("still finds a second GIF frame behind a 1MB first frame", async () => {
				const bytes = [...ascii("GIF89a"), 1, 0, 1, 0, 0x00, 0, 0];
				for (let frame = 0; frame < 2; frame++) {
					bytes.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00, 0x02);
					for (let written = 0; written < MB; written += 255) {
						const size = Math.min(255, MB - written);
						bytes.push(size);
						for (let i = 0; i < size; i++) bytes.push(0);
					}
					bytes.push(0x01, 0x00, 0x00);
				}
				bytes.push(0x3b);
				await expect(
					MediaHelpers.isAnimated(blob(new Uint8Array(bytes), "image/gif")),
				).resolves.toBe(true);
			});
		});
	});

	// Note: The following methods are not tested here as they require extensive DOM mocking
	// that would test the mocking framework more than the actual business logic:
	// - loadVideo: Complex DOM video element mocking
	// - getImageAndDimensions: Image element and DOM manipulation mocking
	// - getVideoSize: Depends on loadVideo
	// - getImageSize: Complex PNG parsing logic with extensive mocking
	// - usingObjectURL: Simple wrapper around URL APIs with cleanup

	// These methods are better tested through integration tests in the consuming packages
	// (like @tldraw/tldraw) where they're used in realistic scenarios.
});
