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
 * @fileoverview Detects animated AVIF buffers by parsing the ISOBMFF `ftyp` box
 * for an image-sequence brand (`avis`/`msf1`), preferring false negatives over
 * false positives.
 *
 * @module @resq-systems/helpers/browser/media/avif
 */

/** Reads a big-endian unsigned 32-bit integer at the given offset. */
function readUint32BE(view: Uint8Array, offset: number): number {
	return (
		((view[offset] << 24) |
			(view[offset + 1] << 16) |
			(view[offset + 2] << 8) |
			view[offset + 3]) >>>
		0
	);
}

/**
 * Checks whether the 4-byte brand at the given offset is an image-sequence
 * (animated) brand. Animated AVIF is indicated by "avis" and/or "msf1".
 * The caller must ensure bytes `offset..offset + 3` are within bounds.
 */
function isImageSequenceBrand(view: Uint8Array, offset: number): boolean {
	// "avis"
	const isAvis =
		view[offset] === 0x61 &&
		view[offset + 1] === 0x76 &&
		view[offset + 2] === 0x69 &&
		view[offset + 3] === 0x73;
	// "msf1"
	const isMsf1 =
		view[offset] === 0x6d &&
		view[offset + 1] === 0x73 &&
		view[offset + 2] === 0x66 &&
		view[offset + 3] === 0x31;

	return isAvis || isMsf1;
}

/**
 * Determines whether an ArrayBuffer contains an animated AVIF image.
 *
 * AVIF is an ISOBMFF container. This function parses the leading `ftyp` box and
 * conservatively reports an animation only when an image-sequence brand
 * (`"avis"` or `"msf1"`) is present in either the major brand or the list of
 * compatible brands. It never reads past the buffer or the declared `ftyp` box
 * size, and prefers false-negatives over false-positives.
 *
 * @param buffer - The ArrayBuffer containing the AVIF image data to analyze
 * @returns True if the buffer is detected as an animated AVIF, false otherwise
 *
 * @example
 * ```ts
 * // Check if an AVIF file is animated
 * const response = await fetch('image.avif')
 * const buffer = await response.arrayBuffer()
 * const isAnimated = isAvifAnimated(buffer)
 * if (isAnimated) {
 *   console.log('This AVIF contains animation!')
 * }
 * ```
 *
 * @example
 * ```ts
 * // Use with file input
 * const fileInput = document.querySelector('input[type="file"]')
 * fileInput.addEventListener('change', async (event) => {
 *   const file = event.target.files[0]
 *   const buffer = await file.arrayBuffer()
 *   const hasAnimation = isAvifAnimated(buffer)
 *   console.log(hasAnimation ? 'Animated AVIF' : 'Static AVIF')
 * })
 * ```
 *
 * @public
 */
export function isAvifAnimated(buffer: ArrayBuffer): boolean {
	const view = new Uint8Array(buffer);

	// The ftyp box is the first box in an ISOBMFF file: a 4-byte big-endian
	// size, a 4-byte type ("ftyp"), a 4-byte major brand, a 4-byte minor
	// version, then zero or more 4-byte compatible brands. We need at least the
	// header plus the major brand (12 bytes) to inspect anything.
	if (view.length < 12) {
		return false;
	}

	// Verify the first box is "ftyp" (0x66 0x74 0x79 0x70).
	if (view[4] !== 0x66 || view[5] !== 0x74 || view[6] !== 0x79 || view[7] !== 0x70) {
		return false;
	}

	const boxSize = readUint32BE(view, 0);
	// A box size of 0 means "extends to end of file"; otherwise clamp the scan
	// to the smaller of the declared box size and the actual buffer length so
	// reads never run past valid data.
	const ftypEnd = boxSize >= 8 ? Math.min(boxSize, view.length) : view.length;

	// Major brand occupies bytes 8-11.
	if (isImageSequenceBrand(view, 8)) {
		return true;
	}

	// Compatible brands follow the 4-byte minor version, starting at byte 16,
	// each 4 bytes wide, up to the end of the ftyp box.
	for (let offset = 16; offset + 4 <= ftypEnd; offset += 4) {
		if (isImageSequenceBrand(view, offset)) {
			return true;
		}
	}

	return false;
}
