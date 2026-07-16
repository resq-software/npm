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
 * Determines whether an ArrayBuffer contains an animated AVIF image.
 *
 * This function performs a simple check by examining the 4th byte of the buffer.
 * AVIF animation is indicated when the byte at index 3 equals 44.
 *
 * @param buffer - The ArrayBuffer containing the AVIF image data to analyze
 * @returns True if the buffer contains an animated AVIF, false otherwise
 *
 * @example
 * ```typescript
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
 * ```typescript
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
export function isAvifAnimated(buffer: ArrayBuffer) {
	const view = new Uint8Array(buffer);
	return view[3] === 44;
}
