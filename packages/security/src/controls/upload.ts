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
 * @fileoverview Upload type agreement — the control for WSTG-BUSL-08 and BUSL-09.
 *
 * This deliberately is not a rule in the threat catalog, because it cannot be one at
 * any grade: the weakness is a *disagreement between three values* — the declared
 * `Content-Type`, the filename extension, and the actual leading bytes — and a rule
 * sees one string at a time. `shell.php.jpg` only becomes interesting once you know
 * the bytes are not a JPEG.
 *
 * The check is allowlist-shaped. A denylist of dangerous extensions is bypassed by the
 * next extension nobody listed; an allowlist of permitted types fails closed.
 *
 * **Still not sufficient alone.** A polyglot can carry a valid PNG header and PHP
 * source in its trailing bytes, and this reads only the head. The controls that hold
 * are: generate the stored filename yourself, store outside the webroot, serve from a
 * separate origin with a fixed `Content-Type` and `Content-Disposition: attachment`,
 * and re-encode images through a parser rather than storing raw bytes.
 *
 * @module @resq-systems/security/controls/upload
 */

//#region Signature table

/** File types this module recognizes from leading bytes. */
export type FileTypeName =
	| "png"
	| "jpeg"
	| "gif"
	| "webp"
	| "bmp"
	| "tiff"
	| "ico"
	| "pdf"
	| "zip"
	| "gzip"
	| "mp4"
	| "svg"
	| "text";

/** One magic-byte signature. `offset` is where `bytes` must appear. */
interface FileSignature {
	readonly type: FileTypeName;
	readonly offset: number;
	readonly bytes: readonly number[];
	/** Further bytes required at a second offset, for container formats. */
	readonly also?: { readonly offset: number; readonly bytes: readonly number[] };
	/** Further bytes at a second offset, any one of which satisfies the signature. */
	readonly alsoAnyOf?: {
		readonly offset: number;
		readonly options: readonly (readonly number[])[];
	};
}

/** ASCII bytes for an ISO base media file format brand. */
const brand = (code: string): readonly number[] => [...code].map((c) => c.charCodeAt(0));

/**
 * ISO-BMFF major brands accepted for the `mp4` family.
 *
 * The `ftyp` box marker sits at offset 4, so a signature that checks only those four
 * bytes constrains nothing at offset 0 — `<!--ftyp--><script>alert(1)</script>` was
 * detected as `mp4` and accepted as `clip.mp4`. Every other row in the table pins
 * offset 0; this one cannot, so it pins the brand at offset 8 instead.
 *
 * The list is deliberately generous: too narrow and legitimate video is rejected,
 * trading a fail-open for a fail-closed. `qt  ` is required by the `.mov` and
 * `video/quicktime` entries already present in the extension and media-type tables.
 */
const MP4_BRANDS: readonly (readonly number[])[] = [
	"isom",
	"iso2",
	"iso4",
	"iso5",
	"iso6",
	"mp41",
	"mp42",
	"mmp4",
	"avc1",
	"dash",
	"M4V ",
	"M4A ",
	"M4P ",
	"M4B ",
	"qt  ",
	"3gp4",
	"3gp5",
	"3g2a",
	"MSNV",
].map(brand);

/**
 * Magic-byte signatures, most specific first.
 *
 * `zip` covers DOCX, XLSX, PPTX, ODT, JAR, and APK — every one is a ZIP container and
 * nothing in the leading bytes distinguishes them. A caller needing that distinction
 * must open the archive and inspect its manifest.
 */
const SIGNATURES: readonly FileSignature[] = [
	{ type: "png", offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
	{ type: "gif", offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
	{ type: "pdf", offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
	// RIFF....WEBP — the four size bytes between the markers are skipped.
	{
		type: "webp",
		offset: 0,
		bytes: [0x52, 0x49, 0x46, 0x46],
		also: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
	},
	{ type: "jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff] },
	{ type: "tiff", offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00] },
	{ type: "tiff", offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a] },
	{ type: "ico", offset: 0, bytes: [0x00, 0x00, 0x01, 0x00] },
	{ type: "zip", offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
	{ type: "zip", offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] },
	{ type: "gzip", offset: 0, bytes: [0x1f, 0x8b] },
	{ type: "bmp", offset: 0, bytes: [0x42, 0x4d] },
	// Last, and below every offset-0 row, so it can never shadow a fixed magic number.
	// The brand requirement at offset 8 is what stops arbitrary content from claiming
	// to be video on the strength of four bytes at offset 4.
	{
		type: "mp4",
		offset: 4,
		bytes: [0x66, 0x74, 0x79, 0x70],
		alsoAnyOf: { offset: 8, options: MP4_BRANDS },
	},
];

/** Extensions each recognized type may legitimately carry. */
const EXTENSIONS_BY_TYPE: Readonly<Record<FileTypeName, readonly string[]>> = {
	png: ["png"],
	jpeg: ["jpg", "jpeg", "jpe"],
	gif: ["gif"],
	webp: ["webp"],
	bmp: ["bmp"],
	tiff: ["tif", "tiff"],
	ico: ["ico"],
	pdf: ["pdf"],
	zip: ["zip", "docx", "xlsx", "pptx", "odt", "ods", "odp", "epub"],
	gzip: ["gz", "tgz"],
	mp4: ["mp4", "m4v", "m4a", "mov"],
	svg: ["svg"],
	text: ["txt", "csv", "md", "log", "json"],
};

/** Media types each recognized type may legitimately be declared as. */
const MEDIA_TYPES_BY_TYPE: Readonly<Record<FileTypeName, readonly string[]>> = {
	png: ["image/png"],
	jpeg: ["image/jpeg", "image/jpg"],
	gif: ["image/gif"],
	webp: ["image/webp"],
	bmp: ["image/bmp", "image/x-ms-bmp"],
	tiff: ["image/tiff"],
	ico: ["image/x-icon", "image/vnd.microsoft.icon"],
	pdf: ["application/pdf"],
	zip: [
		"application/zip",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"application/vnd.oasis.opendocument.text",
		"application/epub+zip",
	],
	gzip: ["application/gzip", "application/x-gzip"],
	mp4: ["video/mp4", "audio/mp4", "video/quicktime"],
	svg: ["image/svg+xml"],
	text: ["text/plain", "text/csv", "text/markdown", "application/json"],
};

//#endregion

//#region Detection

/** Leading bytes inspected when no binary signature matches, to classify text. */
const TEXT_SNIFF_LENGTH = 256;

/** Opening of an SVG document, with or without an XML prolog or leading comments. */
const SVG_OPENING =
	/^\s{0,64}(?:<\?xml[^>]{0,512}\?>\s{0,64})?(?:<!--[^>]{0,512}-->\s{0,64}){0,8}<svg\b/i;

/** True when `haystack` contains `bytes` starting at `offset`. */
function matchesAt(haystack: Uint8Array, offset: number, bytes: readonly number[]): boolean {
	if (haystack.length < offset + bytes.length) return false;
	for (let i = 0; i < bytes.length; i++) {
		if (haystack[offset + i] !== bytes[i]) return false;
	}
	return true;
}

/**
 * Identify a file from its leading bytes.
 *
 * Binary signatures are checked first. If none matches and the bytes decode as UTF-8
 * with no control characters, the content is classified `svg` or `text`.
 *
 * @param headBytes - The file's leading bytes. 64 covers every binary signature here;
 *   256 or more improves text and SVG classification.
 * @returns The detected type, or `null` when nothing matches.
 *
 * @example
 * ```ts
 * detectFileSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
 * // "png"
 * ```
 */
export function detectFileSignature(headBytes: Uint8Array): FileTypeName | null {
	if (!(headBytes instanceof Uint8Array) || headBytes.length === 0) return null;

	for (const signature of SIGNATURES) {
		if (!matchesAt(headBytes, signature.offset, signature.bytes)) continue;
		if (signature.also && !matchesAt(headBytes, signature.also.offset, signature.also.bytes)) {
			continue;
		}
		if (signature.alsoAnyOf) {
			const { offset, options } = signature.alsoAnyOf;
			if (!options.some((candidate) => matchesAt(headBytes, offset, candidate))) continue;
		}
		return signature.type;
	}

	const head = headBytes.subarray(0, TEXT_SNIFF_LENGTH);
	let decoded: string;
	try {
		decoded = new TextDecoder("utf-8", { fatal: true }).decode(head);
	} catch {
		return null;
	}

	// A NUL or other C0 control (tab, CR, and LF excepted) means this is not text.
	for (let i = 0; i < decoded.length; i++) {
		const code = decoded.charCodeAt(i);
		if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) return null;
	}

	return SVG_OPENING.test(decoded) ? "svg" : "text";
}

//#endregion

//#region Agreement check

/** Why an upload was refused. */
export type UploadRejectionReason =
	| "no_bytes"
	| "unrecognized_signature"
	| "type_not_allowed"
	| "extension_missing"
	| "extension_mismatch"
	| "declared_type_mismatch";

/** Outcome of {@link assertUploadType}. */
export type UploadVerdict =
	| { readonly ok: true; readonly type: FileTypeName }
	| { readonly ok: false; readonly reason: UploadRejectionReason; readonly detail: string };

/** Input for {@link assertUploadType}. */
export interface UploadCandidate {
	/** `Content-Type` the client claimed. Parameters such as `; charset=` are ignored. */
	readonly declaredType: string;
	/** Filename the client supplied. */
	readonly filename: string;
	/** The file's leading bytes — at least 64, ideally 256 or more. */
	readonly headBytes: Uint8Array;
	/** Types permitted for this endpoint. An empty list refuses everything. */
	readonly allow: readonly FileTypeName[];
}

/** Lowercase extension without the dot, or `null` when the name carries none. */
function extensionOf(filename: string): string | null {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot <= 0 || lastDot === filename.length - 1) return null;
	return filename
		.slice(lastDot + 1)
		.toLowerCase()
		.trim();
}

/** Media type with parameters and casing stripped. */
function mediaTypeOf(declaredType: string): string {
	if (typeof declaredType !== "string") return "";
	const [base = ""] = declaredType.split(";");
	return base.trim().toLowerCase();
}

/**
 * Require the declared type, the filename extension, and the actual bytes to agree on
 * one permitted file type.
 *
 * The bytes are authoritative — they are the only one of the three a client cannot
 * simply assert. The other two must be consistent with what the bytes actually are,
 * which is what refuses `shell.php.jpg` (bytes are PHP source, extension claims JPEG)
 * and an `avatar.jpg` declared as `application/x-httpd-php`.
 *
 * @param candidate - See {@link UploadCandidate}.
 * @returns `{ ok: true, type }`, or `{ ok: false, reason, detail }`. Never throws.
 *
 * @example
 * ```ts
 * const verdict = assertUploadType({
 *   declaredType: file.type,
 *   filename: file.name,
 *   headBytes: new Uint8Array(await file.slice(0, 256).arrayBuffer()),
 *   allow: ["png", "jpeg", "webp"],
 * });
 *
 * if (!verdict.ok) return new Response(`Rejected: ${verdict.reason}`, { status: 400 });
 *
 * // Generate the stored name yourself — never reuse the client's.
 * const stored = `${crypto.randomUUID()}.${verdict.type}`;
 * ```
 */
export function assertUploadType(candidate: UploadCandidate): UploadVerdict {
	const { declaredType, filename, headBytes, allow } = candidate;

	if (!(headBytes instanceof Uint8Array) || headBytes.length === 0) {
		return { ok: false, reason: "no_bytes", detail: "headBytes was empty" };
	}

	const detected = detectFileSignature(headBytes);
	if (detected === null) {
		return {
			ok: false,
			reason: "unrecognized_signature",
			detail: "leading bytes match no known file type",
		};
	}

	if (!Array.isArray(allow) || !allow.includes(detected)) {
		return {
			ok: false,
			reason: "type_not_allowed",
			detail: `detected ${detected}, which is not in the allowlist`,
		};
	}

	const extension = extensionOf(typeof filename === "string" ? filename : "");
	if (extension === null) {
		return { ok: false, reason: "extension_missing", detail: "filename carries no extension" };
	}

	// The *last* extension is what a webserver dispatches on, so `shell.php.jpg` is
	// judged here as `jpg` and caught by the byte comparison instead, while
	// `avatar.jpg.php` is judged as `php` and caught right here.
	if (!EXTENSIONS_BY_TYPE[detected].includes(extension)) {
		return {
			ok: false,
			reason: "extension_mismatch",
			detail: `bytes are ${detected} but the extension is .${extension}`,
		};
	}

	const media = mediaTypeOf(declaredType);
	if (media.length > 0 && !MEDIA_TYPES_BY_TYPE[detected].includes(media)) {
		return {
			ok: false,
			reason: "declared_type_mismatch",
			detail: `bytes are ${detected} but Content-Type claimed ${media}`,
		};
	}

	return { ok: true, type: detected };
}

//#endregion
