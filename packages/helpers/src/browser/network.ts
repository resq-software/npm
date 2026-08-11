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
 * @fileoverview Thin `window.fetch` / `Image` wrappers that default `referrerPolicy`
 * to `strict-origin-when-cross-origin`, so a cross-origin request does not leak the
 * full referrer URL.
 *
 * A *default*, not a lock: `fetch` honours an explicitly supplied `referrerPolicy`,
 * because a caller who names one means it. Passing `referrerPolicy: undefined` keeps
 * the default rather than clearing it — see the note on the destructure below.
 *
 * @module @resq-systems/helpers/browser/network
 */

/**
 * Just a wrapper around `window.fetch` that sets the `referrerPolicy` to `strict-origin-when-cross-origin`.
 *
 * Performs a network request (side effect). `init` is spread after the default
 * `referrerPolicy`, so a caller-supplied `init.signal` is forwarded and native
 * cancellation is honoured — but a caller-supplied `referrerPolicy` also
 * overrides the secure default. Failure surfaces as a rejected promise, exactly
 * as `window.fetch` rejects.
 *
 * @param input - A Request object or string containing the URL to fetch
 * @param init - Optional request initialization options
 * @returns Promise that resolves to the Response object
 * @internal
 */
export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	// Destructured rather than spread over a default. `{ default, ...init }` copies the
	// key even when its value is `undefined`, so `fetch(url, { method: "POST",
	// referrerPolicy: undefined })` silently deleted the pin: against undici the
	// resulting request policy is `""` — indistinguishable from never pinning it — and
	// an empty request policy falls back to the document's own. A caller who passes a
	// policy explicitly still overrides the default, which is intended.
	const { referrerPolicy = "strict-origin-when-cross-origin", ...rest } = init ?? {};

	// eslint-disable-next-line tldraw/no-restricted-properties
	return window.fetch(input, { ...rest, referrerPolicy });
}

/**
 * Just a wrapper around `new Image`, and yeah, it's a bit strange that it's in the network.ts file
 * but the main concern here is the referrerPolicy and setting it correctly.
 *
 * @param width - Optional width for the image element
 * @param height - Optional height for the image element
 * @returns HTMLImageElement with referrerPolicy set to 'strict-origin-when-cross-origin'
 * @internal
 */
export function Image(width?: number, height?: number) {
	// eslint-disable-next-line tldraw/no-restricted-properties
	const img = new window.Image(width, height);
	img.referrerPolicy = "strict-origin-when-cross-origin";
	return img;
}
