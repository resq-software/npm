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

/**
 * @fileoverview Media type tables and `MediaHelpers`: supported image/video MIME
 * lists plus browser helpers for loading images and videos, measuring
 * dimensions (honoring PNG pHYs DPI), extracting video frames, and detecting
 * animation.
 *
 * @module @resq-systems/helpers/browser/media/media
 */

import { promiseWithResolve } from "../../utils/control.js";
import { Image } from "../network.js";
import { isApngAnimated } from "./apng.js";
import { isAvifAnimated } from "./avif.js";
import { isGifAnimated } from "./gif.js";
import { PngHelpers } from "./png.js";
import { isWebpAnimated } from "./webp.js";

//#region Constants

/**
 * Array of supported vector image MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES } from '@resq-systems/helpers/browser'
 *
 * const isSvg = DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES.includes('image/svg+xml')
 * console.log(isSvg) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES = Object.freeze(["image/svg+xml" as const]);
/**
 * Array of supported static (non-animated) image MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES } from '@resq-systems/helpers/browser'
 *
 * const isStatic = DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES.includes('image/jpeg')
 * console.log(isStatic) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES = Object.freeze([
	"image/jpeg" as const,
	"image/png" as const,
	"image/webp" as const,
]);
/**
 * Array of supported animated image MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES } from '@resq-systems/helpers/browser'
 *
 * const isAnimated = DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES.includes('image/gif')
 * console.log(isAnimated) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES = Object.freeze([
	"image/gif" as const,
	"image/apng" as const,
	"image/avif" as const,
]);
/**
 * Array of all supported image MIME types, combining static, vector, and animated types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_IMAGE_TYPES } from '@resq-systems/helpers/browser'
 *
 * const isSupported = DEFAULT_SUPPORTED_IMAGE_TYPES.includes('image/png')
 * console.log(isSupported) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_IMAGE_TYPES = Object.freeze([
	...DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES,
	...DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES,
	...DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES,
]);
/**
 * Array of supported video MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORT_VIDEO_TYPES } from '@resq-systems/helpers/browser'
 *
 * const isVideo = DEFAULT_SUPPORT_VIDEO_TYPES.includes('video/mp4')
 * console.log(isVideo) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORT_VIDEO_TYPES = Object.freeze([
	"video/mp4" as const,
	"video/webm" as const,
	"video/quicktime" as const,
]);
/**
 * Array of all supported media MIME types, combining images and videos.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_MEDIA_TYPES } from '@resq-systems/helpers/browser'
 *
 * const isMediaFile = DEFAULT_SUPPORTED_MEDIA_TYPES.includes('video/mp4')
 * console.log(isMediaFile) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_MEDIA_TYPES = Object.freeze([
	...DEFAULT_SUPPORTED_IMAGE_TYPES,
	...DEFAULT_SUPPORT_VIDEO_TYPES,
]);
/**
 * Comma-separated string of all supported media MIME types, useful for HTML file input accept attributes.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_MEDIA_TYPE_LIST } from '@resq-systems/helpers/browser'
 *
 * // Use in HTML file input for media uploads
 * const input = document.createElement('input')
 * input.type = 'file'
 * input.accept = DEFAULT_SUPPORTED_MEDIA_TYPE_LIST
 * input.addEventListener('change', (e) => {
 *   const files = (e.target as HTMLInputElement).files
 *   if (files) console.log(`Selected ${files.length} file(s)`)
 * })
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_MEDIA_TYPE_LIST = DEFAULT_SUPPORTED_MEDIA_TYPES.join(",");

//#endregion

//#region Types

/**
 * A MIME type listed in {@link DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES}.
 *
 * @public
 */
export type SupportedVectorImageType = (typeof DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES)[number];
/**
 * A MIME type listed in {@link DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES}.
 *
 * @public
 */
export type SupportedStaticImageType = (typeof DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES)[number];
/**
 * A MIME type listed in {@link DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES}.
 *
 * @public
 */
export type SupportedAnimatedImageType = (typeof DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES)[number];
/**
 * A MIME type listed in {@link DEFAULT_SUPPORTED_IMAGE_TYPES} — the union of the
 * static, vector, and animated image types.
 *
 * @public
 */
export type SupportedImageType = (typeof DEFAULT_SUPPORTED_IMAGE_TYPES)[number];
/**
 * A MIME type listed in {@link DEFAULT_SUPPORT_VIDEO_TYPES}.
 *
 * @public
 */
export type SupportedVideoType = (typeof DEFAULT_SUPPORT_VIDEO_TYPES)[number];
/**
 * A MIME type listed in {@link DEFAULT_SUPPORTED_MEDIA_TYPES} — every supported
 * image and video type.
 *
 * @public
 */
export type SupportedMediaType = (typeof DEFAULT_SUPPORTED_MEDIA_TYPES)[number];

//#endregion

//#region Internal

/**
 * Membership test that narrows an arbitrary MIME string to the literal union of
 * a supported-type table.
 *
 * `Array.includes` on a `readonly ("image/png" | ...)[]` rejects a plain
 * `string` argument, which is what forced the old `as any` casts. Widening the
 * table to `readonly string[]` for the lookup keeps the call type-safe while the
 * type predicate hands the literal union back to the caller.
 *
 * @param supported - Table of supported MIME literals to test against
 * @param mimeType - Candidate MIME type; `null`/`undefined` are never members
 * @returns True when `mimeType` is one of `supported`
 *
 * @internal
 */
function isSupportedMimeType<T extends string>(
	supported: readonly T[],
	mimeType: string | null | undefined,
): mimeType is T {
	const widened: readonly string[] = supported;
	return mimeType != null && widened.includes(mimeType);
}

//#endregion

//#region Public API

/**
 * Helpers for media
 *
 * @public
 */

// biome-ignore lint/complexity/noStaticOnlyClass: the static methods are the public API, and this class is not meant to be instantiated.
export class MediaHelpers {
	/**
	 * Load a video element from a URL with cross-origin support.
	 *
	 * Creates a detached `<video>` element and starts a cross-origin network
	 * load (side effects). Failure is a **rejected** promise, not a resolved
	 * error value.
	 *
	 * @param src - The URL of the video to load
	 * @param doc - Optional document to create the video element in
	 * @returns Promise that resolves to the loaded HTMLVideoElement
	 * @throws {Error} Rejects with `"Could not load video"` if the element emits
	 *   an `error` event (bad URL, decode failure, CORS denial).
	 * @example
	 * ```ts
	 * const video = await MediaHelpers.loadVideo('https://example.com/video.mp4')
	 * console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`)
	 * ```
	 * @public
	 */
	static loadVideo(src: string, doc?: Document): Promise<HTMLVideoElement> {
		return new Promise((resolve, reject) => {
			// eslint-disable-next-line no-restricted-globals
			const video = (doc ?? document).createElement("video");
			video.onloadeddata = () => resolve(video);
			video.onerror = (e) => {
				console.error(e);
				reject(new Error("Could not load video"));
			};
			video.crossOrigin = "anonymous";
			video.src = src;
		});
	}

	/**
	 * Extract a frame from a video element as a data URL.
	 *
	 * For a non-zero `time` this **mutates the passed `video`**: it sets
	 * `video.currentTime` to seek, then captures once the `seeked` event fires.
	 * Event listeners are attached and removed internally, so the element is left
	 * as found apart from its playback position. Failure is a **rejected**
	 * promise.
	 *
	 * @param video - The HTMLVideoElement to extract frame from
	 * @param time - The time in seconds to extract the frame from (default: 0)
	 * @returns Promise that resolves to a data URL of the video frame
	 * @throws {Error} Rejects with `"Could not get video frame"` on the video's
	 *   `error` / `stalled` events. If a 2D canvas context cannot be obtained, an
	 *   `Error("Could not get 2d context")` is thrown inside the event handler and
	 *   the promise never settles.
	 * @example
	 * ```ts
	 * const video = await MediaHelpers.loadVideo('https://example.com/video.mp4')
	 * const frameDataUrl = await MediaHelpers.getVideoFrameAsDataUrl(video, 5.0)
	 * // Use frameDataUrl as image thumbnail
	 * const img = document.createElement('img')
	 * img.src = frameDataUrl
	 * ```
	 * @public
	 */
	static async getVideoFrameAsDataUrl(video: HTMLVideoElement, time = 0): Promise<string> {
		const promise = promiseWithResolve<string>();
		let didSetTime = false;
		let isSeeking = false;

		const onReadyStateChanged = (e?: Event) => {
			if (!didSetTime) {
				if (video.readyState >= video.HAVE_METADATA) {
					didSetTime = true;
					// Setting currentTime starts an asynchronous seek. Only seek
					// when a non-zero frame is requested; capturing before the
					// seek completes would grab the frame at time 0.
					if (time !== 0) {
						isSeeking = true;
						video.currentTime = time;
					}
				} else {
					return;
				}
			}

			// The seek is only complete once the "seeked" event fires.
			if (e?.type === "seeked") {
				isSeeking = false;
			}

			if (!isSeeking && video.readyState >= video.HAVE_CURRENT_DATA) {
				// eslint-disable-next-line no-restricted-globals
				const canvas = (video.ownerDocument ?? document).createElement("canvas");
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					throw new Error("Could not get 2d context");
				}
				ctx.drawImage(video, 0, 0);
				promise.resolve(canvas.toDataURL());
			}
		};
		const onError = (e: Event) => {
			console.error(e);
			promise.reject(new Error("Could not get video frame"));
		};

		video.addEventListener("loadedmetadata", onReadyStateChanged);
		video.addEventListener("loadeddata", onReadyStateChanged);
		video.addEventListener("canplay", onReadyStateChanged);
		video.addEventListener("seeked", onReadyStateChanged);

		video.addEventListener("error", onError);
		video.addEventListener("stalled", onError);

		onReadyStateChanged();

		try {
			return await promise;
		} finally {
			video.removeEventListener("loadedmetadata", onReadyStateChanged);
			video.removeEventListener("loadeddata", onReadyStateChanged);
			video.removeEventListener("canplay", onReadyStateChanged);
			video.removeEventListener("seeked", onReadyStateChanged);

			video.removeEventListener("error", onError);
			video.removeEventListener("stalled", onError);
		}
	}

	/**
	 * Load an image from a URL and get its dimensions along with the image element.
	 *
	 * Starts a cross-origin image load. When the image reports no
	 * `naturalWidth` (Firefox with SVGs), it briefly appends the element to
	 * `doc.body` to measure `clientWidth`/`clientHeight`, then removes it — a
	 * transient DOM mutation. Failure is a **rejected** promise.
	 *
	 * @param src - The URL of the image to load
	 * @param doc - Optional document to use for DOM operations (e.g. measuring SVG dimensions)
	 * @returns Promise that resolves to an object with width, height, and the image element
	 * @throws {Error} Rejects with `"Could not load image"` if the element emits
	 *   an `error` event (bad URL, decode failure, CORS denial).
	 * @example
	 * ```ts
	 * const { w, h, image } = await MediaHelpers.getImageAndDimensions('https://example.com/image.png')
	 * console.log(`Image size: ${w}x${h}`)
	 * // Image is ready to use
	 * document.body.appendChild(image)
	 * ```
	 * @public
	 */
	static getImageAndDimensions(
		src: string,
		doc?: Document,
	): Promise<{ w: number; h: number; image: HTMLImageElement }> {
		return new Promise((resolve, reject) => {
			const img = Image();
			img.onload = () => {
				let dimensions: { w: number; h: number };
				if (img.naturalWidth) {
					dimensions = {
						w: img.naturalWidth,
						h: img.naturalHeight,
					};
				} else {
					// Sigh, Firefox doesn't have naturalWidth or naturalHeight for SVGs. :-/
					// We have to attach to dom and use clientWidth/clientHeight.
					// eslint-disable-next-line no-restricted-globals
					const body = (doc ?? document).body;
					body.appendChild(img);
					dimensions = {
						w: img.clientWidth,
						h: img.clientHeight,
					};
					body.removeChild(img);
				}
				resolve({ ...dimensions, image: img });
			};
			img.onerror = (e) => {
				console.error(e);
				reject(new Error("Could not load image"));
			};
			img.crossOrigin = "anonymous";
			img.referrerPolicy = "strict-origin-when-cross-origin";
			img.style.visibility = "hidden";
			img.style.position = "absolute";
			img.style.opacity = "0";
			img.style.zIndex = "-9999";
			img.src = src;
		});
	}

	/**
	 * Get the size of a video blob
	 *
	 * Creates and revokes a temporary object URL around a {@link loadVideo} call.
	 *
	 * @param blob - A Blob containing the video
	 * @param doc - Optional document to create elements in
	 * @returns Promise that resolves to an object with width and height properties
	 * @throws {Error} Rejects with `"Could not load video"` when the blob cannot
	 *   be decoded as a playable video.
	 * @example
	 * ```ts
	 * const file = new File([...], 'video.mp4', { type: 'video/mp4' })
	 * const { w, h } = await MediaHelpers.getVideoSize(file)
	 * console.log(`Video dimensions: ${w}x${h}`)
	 * ```
	 * @public
	 */
	static async getVideoSize(blob: Blob, doc?: Document): Promise<{ w: number; h: number }> {
		return MediaHelpers.usingObjectURL(blob, async (url) => {
			const video = await MediaHelpers.loadVideo(url, doc);
			return { w: video.videoWidth, h: video.videoHeight };
		});
	}

	/**
	 * Get the size of an image blob
	 *
	 * For PNGs, inspects the `pHYs` chunk to recover a device pixel ratio and
	 * divides the raw pixel dimensions by it; any error while parsing the chunk
	 * is swallowed and the raw size with `pixelRatio: 1` is returned instead.
	 *
	 * @param blob - A Blob containing the image
	 * @param doc - Optional document to use for DOM operations
	 * @returns Promise that resolves to an object with `w`, `h`, and the resolved
	 *   `pixelRatio` (`1` when no high-DPI metadata applies or parsing failed).
	 * @throws {Error} Rejects with `"Could not load image"` when the blob cannot
	 *   be decoded (the image-load step; the PNG-metadata step never rejects).
	 * @example
	 * ```ts
	 * const file = new File([...], 'image.png', { type: 'image/png' })
	 * const { w, h } = await MediaHelpers.getImageSize(file)
	 * console.log(`Image dimensions: ${w}x${h}`)
	 * ```
	 * @public
	 */
	static async getImageSize(
		blob: Blob,
		doc?: Document,
	): Promise<{ w: number; h: number; pixelRatio: number }> {
		const { w, h } = await MediaHelpers.usingObjectURL(blob, (url) =>
			MediaHelpers.getImageAndDimensions(url, doc),
		);

		try {
			if (blob.type === "image/png") {
				const view = new DataView(await blob.arrayBuffer());
				if (PngHelpers.isPng(view, 0)) {
					const physChunk = PngHelpers.findChunk(view, "pHYs");
					if (physChunk) {
						const physData = PngHelpers.parsePhys(view, physChunk.dataOffset);
						if (physData.unit === 1 && physData.ppux === physData.ppuy) {
							const dpi = Math.round(physData.ppux * 0.0254);
							// Try both standard baselines: Windows/web = 96, macOS = 72.
							// Pick whichever yields a clean integer ratio > 1.
							const r96 = dpi / 96;
							const r72 = dpi / 72;
							let pixelRatio = 1;
							if (Number.isInteger(r96) && r96 > 1) {
								pixelRatio = r96;
							} else if (Number.isInteger(r72) && r72 > 1) {
								pixelRatio = r72;
							}
							if (pixelRatio > 1) {
								return {
									w: Math.ceil(w / pixelRatio),
									h: Math.ceil(h / pixelRatio),
									pixelRatio,
								};
							}
						}
					}
				}
			}
		} catch (err) {
			console.error(err);
			return { w, h, pixelRatio: 1 };
		}
		return { w, h, pixelRatio: 1 };
	}

	/**
	 * Check if a media file blob contains animation data.
	 *
	 * @param file - The Blob to check for animation
	 * @returns Promise that resolves to true if the file is animated, false otherwise
	 * @example
	 * ```ts
	 * const file = new File([...], 'animation.gif', { type: 'image/gif' })
	 * const animated = await MediaHelpers.isAnimated(file)
	 * console.log(animated ? 'Animated' : 'Static')
	 * ```
	 * @public
	 */
	static async isAnimated(file: Blob): Promise<boolean> {
		if (file.type === "image/gif") {
			return isGifAnimated(await file.arrayBuffer());
		}

		if (file.type === "image/avif") {
			return isAvifAnimated(await file.arrayBuffer());
		}

		if (file.type === "image/webp") {
			return isWebpAnimated(await file.arrayBuffer());
		}

		if (file.type === "image/apng") {
			return isApngAnimated(await file.arrayBuffer());
		}

		return false;
	}

	/**
	 * Check if a MIME type represents an animated image format.
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is an animated image format, false otherwise
	 * @example
	 * ```ts
	 * const isAnimated = MediaHelpers.isAnimatedImageType('image/gif')
	 * console.log(isAnimated) // true
	 * ```
	 * @public
	 */
	static isAnimatedImageType(mimeType: string | null): mimeType is SupportedAnimatedImageType {
		return isSupportedMimeType(DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES, mimeType);
	}

	/**
	 * Check if a MIME type represents a static (non-animated) image format.
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is a static image format, false otherwise
	 * @example
	 * ```ts
	 * const isStatic = MediaHelpers.isStaticImageType('image/jpeg')
	 * console.log(isStatic) // true
	 * ```
	 * @public
	 */
	static isStaticImageType(mimeType: string | null): mimeType is SupportedStaticImageType {
		return isSupportedMimeType(DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES, mimeType);
	}

	/**
	 * Check if a MIME type represents a vector image format.
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is a vector image format, false otherwise
	 * @example
	 * ```ts
	 * const isVector = MediaHelpers.isVectorImageType('image/svg+xml')
	 * console.log(isVector) // true
	 * ```
	 * @public
	 */
	static isVectorImageType(mimeType: string | null): mimeType is SupportedVectorImageType {
		return isSupportedMimeType(DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES, mimeType);
	}

	/**
	 * Check if a MIME type represents any supported image format (static, animated, or vector).
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is a supported image format, false otherwise
	 * @example
	 * ```ts
	 * const isImage = MediaHelpers.isImageType('image/png')
	 * console.log(isImage) // true
	 * ```
	 * @public
	 */
	static isImageType(mimeType: string): mimeType is SupportedImageType {
		return isSupportedMimeType(DEFAULT_SUPPORTED_IMAGE_TYPES, mimeType);
	}

	/**
	 * Utility function to create an object URL from a blob, execute a function with it, and automatically clean it up.
	 *
	 * `URL.revokeObjectURL` runs in a `finally`, so the URL is released whether
	 * `fn` resolves or rejects. A rejection from `fn` propagates unchanged.
	 *
	 * @template T - The value `fn` resolves to and this method returns.
	 * @param blob - The Blob to create an object URL for
	 * @param fn - Function to execute with the object URL
	 * @returns Promise that resolves to the result of the function
	 * @example
	 * ```ts
	 * const result = await MediaHelpers.usingObjectURL(imageBlob, async (url) => {
	 *   const { w, h } = await MediaHelpers.getImageAndDimensions(url)
	 *   return { width: w, height: h }
	 * })
	 * // Object URL is automatically revoked after function completes
	 * console.log(`Image dimensions: ${result.width}x${result.height}`)
	 * ```
	 * @public
	 */
	static async usingObjectURL<T>(blob: Blob, fn: (url: string) => Promise<T>): Promise<T> {
		const url = URL.createObjectURL(blob);
		try {
			return await fn(url);
		} finally {
			URL.revokeObjectURL(url);
		}
	}
}

//#endregion
