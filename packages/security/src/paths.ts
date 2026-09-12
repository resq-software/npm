/**
 * Copyright 2026 ResQ Systems, Inc.
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
 * @fileoverview Path containment — the *prevention* half of CWE-22, as distinct from
 * the detection rules in `@resq-systems/security/threats`.
 *
 * Detecting `../` is not the control. CWE-22 describes the failure to keep a
 * constructed path inside its restricted directory, so the control is to resolve the
 * candidate against the base and verify the result still lives beneath it. That check
 * holds for inputs no signature catches: an absolute path, a Windows drive-relative
 * path, an alternate separator, or a name whose `..` only appears after normalization.
 *
 * **Node-only.** This module statically imports `node:path` and is therefore published
 * exclusively under the `@resq-systems/security/paths` subpath, never through the
 * package root, so browser bundles of the root barrel stay free of Node builtins.
 *
 * @module @resq-systems/security/paths
 */

import path from "node:path";

//#region Containment

/** Options for {@link resolveContainedPath}. */
export interface ContainmentOptions {
	/**
	 * Treat the base directory itself as an acceptable result. Defaults to `true`.
	 * Pass `false` when the caller requires a path strictly *inside* the base — an
	 * upload target, say, rather than a listing root.
	 */
	readonly allowBaseItself?: boolean;
}

/** NUL truncates paths in some syscall layers, so it is rejected before resolution. */
const NUL = "\u0000";

/**
 * Resolve an untrusted path against a base directory and verify containment.
 *
 * The candidate is resolved against the base — which also normalizes `.`, `..`, and
 * duplicate separators — and accepted only if the result is the base or sits beneath
 * it. An absolute `untrustedPath` overrides the base under `path.resolve` semantics,
 * so it too is caught by the containment check rather than silently trusted.
 *
 * **This function performs no filesystem I/O**, so it cannot see symlinks. A path that
 * is textually contained may still resolve on disk to a target outside the base. When
 * the target may exist and may be a link, follow up with `fs.promises.realpath` on
 * both the base and the result and re-run {@link isPathContained} on those.
 *
 * @param baseDirectory - Directory the result must stay within. Resolved against the
 *   process working directory when relative.
 * @param untrustedPath - Candidate path from an untrusted source.
 * @param options - See {@link ContainmentOptions}.
 * @returns The resolved absolute path when contained, otherwise `null`. Also `null`
 *   for non-string arguments, an empty base, or a NUL byte in either argument.
 *
 * @example
 * ```ts
 * const base = "/srv/uploads";
 *
 * resolveContainedPath(base, "avatar.png");        // "/srv/uploads/avatar.png"
 * resolveContainedPath(base, "nested/a.txt");      // "/srv/uploads/nested/a.txt"
 * resolveContainedPath(base, "../../etc/passwd");  // null
 * resolveContainedPath(base, "/etc/passwd");       // null
 * ```
 */
export function resolveContainedPath(
	baseDirectory: string,
	untrustedPath: string,
	options: ContainmentOptions = {},
): string | null {
	if (typeof baseDirectory !== "string" || typeof untrustedPath !== "string") {
		return null;
	}
	if (baseDirectory.length === 0) return null;

	// `a.txt\0.png` can pass an extension check and then open `a.txt`.
	if (untrustedPath.includes(NUL) || baseDirectory.includes(NUL)) {
		return null;
	}

	const { allowBaseItself = true } = options;

	const base = path.resolve(baseDirectory);
	const candidate = path.resolve(base, untrustedPath);
	const relative = path.relative(base, candidate);

	if (relative === "") {
		return allowBaseItself ? candidate : null;
	}

	// `path.relative` yields a `..`-prefixed path when the candidate escapes, and an
	// absolute path when the two sit on different Windows drives.
	if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
		return null;
	}

	return candidate;
}

/**
 * Boolean form of {@link resolveContainedPath}.
 *
 * @param baseDirectory - Directory the candidate must stay within.
 * @param candidatePath - Path to test.
 * @param options - See {@link ContainmentOptions}.
 * @returns `true` when the candidate resolves inside the base.
 */
export function isPathContained(
	baseDirectory: string,
	candidatePath: string,
	options?: ContainmentOptions,
): boolean {
	return resolveContainedPath(baseDirectory, candidatePath, options) !== null;
}

//#endregion

//#region Filename sanitization

/**
 * Characters invalid in a Windows path segment, plus both separators and the C0
 * control range.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are invalid in filenames and must be stripped
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;

/**
 * Windows device names, reserved regardless of extension — opening `CON.txt` still
 * targets the console device.
 */
const RESERVED_WINDOWS_NAMES = /^(?:CON|PRN|AUX|NUL|COM\d|LPT\d)(?:\.|$)/i;

/** Longest filename accepted on common filesystems. */
const MAX_FILENAME_LENGTH = 255;

/** Longest extension preserved when truncating an over-long filename. */
const MAX_PRESERVED_EXTENSION = 16;

/**
 * Reduce an untrusted string to a single safe path segment.
 *
 * Strips directory separators, control characters, and Windows-reserved characters;
 * removes leading dots so the result cannot become `.`/`..` or a hidden file; trims
 * the trailing dots and spaces Windows silently drops (which is how `evil.php.`
 * becomes `evil.php` after the fact); and refuses reserved device names.
 *
 * The output is a *segment*, never a path. Join it onto a base directory yourself and
 * confirm the result with {@link resolveContainedPath} — that remains the containment
 * control; this is only hygiene.
 *
 * @param filename - Untrusted filename, typically from a multipart upload.
 * @param fallback - Returned when nothing usable survives. Defaults to `"file"`.
 * @returns A safe single path segment.
 *
 * @example
 * ```ts
 * sanitizeFilename("../../etc/passwd"); // "etcpasswd"
 * sanitizeFilename("report.pdf.");      // "report.pdf"
 * sanitizeFilename("CON.txt");          // "file"
 * ```
 */
export function sanitizeFilename(filename: string, fallback = "file"): string {
	if (typeof filename !== "string" || filename.length === 0) return fallback;

	let safe = filename
		.normalize("NFC")
		.replace(UNSAFE_FILENAME_CHARS, "")
		.replace(/^\.+/, "")
		.replace(/[. ]+$/, "")
		.trim();

	if (safe.length === 0) return fallback;
	if (RESERVED_WINDOWS_NAMES.test(safe)) return fallback;

	if (safe.length > MAX_FILENAME_LENGTH) {
		const extension = path.extname(safe).slice(0, MAX_PRESERVED_EXTENSION);
		safe = safe.slice(0, MAX_FILENAME_LENGTH - extension.length) + extension;
	}

	return safe;
}

//#endregion
