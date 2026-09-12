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
 * MIT License: https://github.com/vHeemstra/is-apng/blob/main/license
 * Copyright (c) Philip van Heemstra
 */

/**
 * @fileoverview Detects animated PNG (APNG) buffers by locating an animation
 * control (`acTL`) chunk before the first image data (`IDAT`) chunk.
 *
 * @module @resq-systems/helpers/browser/media/apng
 */

/** Bytes in the PNG file signature that precedes the first chunk. */
const PNG_SIGNATURE_SIZE = 8;

/** Bytes in a chunk's big-endian length field. */
const LENGTH_SIZE = 4;

/** Bytes in a chunk's four-character type field. */
const TYPE_SIZE = 4;

/** Bytes in a chunk's trailing CRC-32. */
const CRC_SIZE = 4;

/**
 * Largest chunk length the PNG specification permits.
 *
 * Clause 5.3 caps it at 2^31-1 and requires the high bit to be zero, so a longer
 * declared length means the stream is malformed rather than merely truncated.
 */
const MAX_CHUNK_LENGTH = 0x7fffffff;

/**
 * Smallest byte count that can hold a signature plus one chunk header.
 *
 * Anything shorter cannot be walked, so it is rejected before the loop.
 */
const MIN_PNG_SIZE = PNG_SIGNATURE_SIZE + LENGTH_SIZE + TYPE_SIZE;

/**
 * Determines whether an ArrayBuffer contains an animated PNG (APNG) image.
 *
 * This function checks if the provided buffer contains a valid PNG file with animation
 * control chunks (acTL) that precede the image data chunks (IDAT), which indicates
 * it's an animated PNG rather than a static PNG.
 *
 * @param buffer - The ArrayBuffer containing the image data to analyze
 * @returns True if the buffer contains an animated PNG, false otherwise
 *
 * @example
 * ```ts
 * // Check if an uploaded file contains an animated PNG
 * if (file.type === 'image/apng') {
 *   const isAnimated = isApngAnimated(await file.arrayBuffer())
 *   console.log(isAnimated ? 'Animated PNG' : 'Static PNG')
 * }
 * ```
 *
 * @example
 * ```ts
 * // Use with fetch to check remote images
 * const response = await fetch('image.png')
 * const buffer = await response.arrayBuffer()
 * const hasAnimation = isApngAnimated(buffer)
 * ```
 *
 * @public
 */
export function isApngAnimated(buffer: ArrayBuffer): boolean {
	const view = new Uint8Array(buffer);

	// `view` is a Uint8Array constructed on the line above, so the old
	// `Buffer.isBuffer` branch here could never be reached.
	if (view.length < MIN_PNG_SIZE) {
		return false;
	}

	const isPNG =
		view[0] === 0x89 &&
		view[1] === 0x50 &&
		view[2] === 0x4e &&
		view[3] === 0x47 &&
		view[4] === 0x0d &&
		view[5] === 0x0a &&
		view[6] === 0x1a &&
		view[7] === 0x0a;

	if (!isPNG) {
		return false;
	}

	// APNGs carry an animation control chunk (acTL) before the first IDAT.
	// See https://en.wikipedia.org/wiki/APNG#File_format
	//
	// Walked as a chunk stream rather than scanned as text. The previous
	// implementation decoded the bytes with a streaming TextDecoder and accumulated
	// UTF-16 code-unit counts as if they were byte offsets, so any multi-byte
	// sequence ahead of acTL shrank the index and the comparison silently failed —
	// genuinely-encoded APNGs carrying a compressed ICC profile reported *not*
	// animated. Scanning for the literal text also matched chunk *data*, so a static
	// PNG with `acTL` inside a tEXt comment reported animated. Matching the 4-byte
	// type field at a known offset fixes both directions.
	const data = new DataView(view.buffer, view.byteOffset, view.byteLength);
	let offset = PNG_SIGNATURE_SIZE;

	while (offset + LENGTH_SIZE + TYPE_SIZE <= view.length) {
		const length = data.getUint32(offset);
		// The PNG spec caps chunk length at 2^31-1 with the high bit zero; anything
		// larger, or any chunk running past the end, means the stream is malformed.
		if (length > MAX_CHUNK_LENGTH) return false;
		if (offset + LENGTH_SIZE + TYPE_SIZE + length + CRC_SIZE > view.length) return false;

		const type = String.fromCharCode(
			view[offset + 4] as number,
			view[offset + 5] as number,
			view[offset + 6] as number,
			view[offset + 7] as number,
		);

		if (type === "acTL") return true;
		// acTL must precede the first IDAT, so either marker ends the search.
		if (type === "IDAT" || type === "IEND") return false;

		offset += LENGTH_SIZE + TYPE_SIZE + length + CRC_SIZE;
	}

	return false;
}
