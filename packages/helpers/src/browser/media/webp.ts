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

/*!
 * MIT License: https://github.com/sindresorhus/is-webp/blob/main/license
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 */

/**
 * @fileoverview Detects WebP buffers and animated WebP by reading the extended
 * `VP8X` chunk's animation flag; simple VP8/VP8L files report static.
 *
 * @module @resq-systems/helpers/browser/media/webp
 */

/**
 * Determines whether a byte array represents a WebP image by checking the WebP file signature.
 *
 * @param view - The Uint8Array containing the potential WebP image data
 * @returns True if the byte array is a valid WebP image, false otherwise
 * @example
 * ```ts
 * // Check if file data is WebP format
 * const file = new File([...], 'image.webp', { type: 'image/webp' })
 * const buffer = await file.arrayBuffer()
 * const view = new Uint8Array(buffer)
 * const isWebPImage = isWebp(view)
 * console.log(isWebPImage ? 'Valid WebP' : 'Not WebP')
 * ```
 * @internal
 */
export function isWebp(view: Uint8Array) {
	if (!view || view.length < 12) {
		return false;
	}

	return view[8] === 87 && view[9] === 69 && view[10] === 66 && view[11] === 80;
}

/**
 * Determines whether a WebP image file contains animation data by checking the animation flag in the WebP VP8X chunk.
 *
 * @param buffer - The ArrayBuffer containing the WebP image data
 * @returns True if the WebP image is animated, false otherwise
 * @example
 * ```ts
 * // Check if a WebP file from user input is animated
 * const file = new File([...], 'image.webp', { type: 'image/webp' })
 * const buffer = await file.arrayBuffer()
 * const animated = isWebpAnimated(buffer)
 * console.log(animated ? 'Animated WebP' : 'Static WebP')
 * ```
 * @public
 */
export function isWebpAnimated(buffer: ArrayBuffer) {
	const view = new Uint8Array(buffer);

	if (!isWebp(view)) {
		return false;
	}

	if (view.length < 21) {
		return false;
	}

	// Only Extended WebP files carry a "VP8X" chunk (bytes 12-15) whose byte 20
	// holds the feature flags, including the animation bit. Simple WebP files
	// (lossy "VP8 " or lossless "VP8L") have no VP8X chunk, so byte 20 is raw
	// bitstream data and must not be interpreted as an animation flag.
	const isExtended =
		view[12] === 86 && // V
		view[13] === 80 && // P
		view[14] === 56 && // 8
		view[15] === 88; // X

	if (!isExtended) {
		return false;
	}

	return ((view[20] >> 1) & 1) === 1;
}
