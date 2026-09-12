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

import { createHash } from "node:crypto";
import { emailDesignContract } from "../src/email-design-contract.js";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const PNG_IHDR_LENGTH = 13;
const PNG_IHDR_OFFSET = PNG_SIGNATURE.length;
const PNG_IHDR_DATA_OFFSET = PNG_IHDR_OFFSET + 8;

export interface EmailLogoExpectation {
	readonly url: string;
	readonly sha256: string;
	readonly byteLength: number;
	readonly width: number;
	readonly height: number;
	readonly bitDepth: number;
	readonly colorType: number;
}

export interface VerifiedEmailLogo {
	readonly url: string;
	readonly sha256: string;
	readonly byteLength: number;
	readonly width: number;
	readonly height: number;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(`email logo verification failed: ${message}`);
	}
}

function isPngMediaType(contentType: string | null): boolean {
	return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "image/png";
}

function readPngHeader(bytes: Uint8Array): {
	width: number;
	height: number;
	bitDepth: number;
	colorType: number;
	compression: number;
	filter: number;
	interlace: number;
} {
	assert(bytes.byteLength >= PNG_IHDR_DATA_OFFSET + PNG_IHDR_LENGTH, "PNG is missing IHDR data");
	for (const [index, expected] of PNG_SIGNATURE.entries()) {
		assert(bytes[index] === expected, "PNG signature is malformed");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	assert(view.getUint32(PNG_IHDR_OFFSET) === PNG_IHDR_LENGTH, "PNG IHDR length is invalid");
	assert(
		String.fromCharCode(...bytes.slice(PNG_IHDR_OFFSET + 4, PNG_IHDR_DATA_OFFSET)) === "IHDR",
		"PNG first chunk is not IHDR",
	);

	return {
		width: view.getUint32(PNG_IHDR_DATA_OFFSET),
		height: view.getUint32(PNG_IHDR_DATA_OFFSET + 4),
		bitDepth: bytes[PNG_IHDR_DATA_OFFSET + 8]!,
		colorType: bytes[PNG_IHDR_DATA_OFFSET + 9]!,
		compression: bytes[PNG_IHDR_DATA_OFFSET + 10]!,
		filter: bytes[PNG_IHDR_DATA_OFFSET + 11]!,
		interlace: bytes[PNG_IHDR_DATA_OFFSET + 12]!,
	};
}

/** Validate one fetched logo response against the immutable email contract. */
export async function verifyEmailLogoResponse(
	response: Response,
	expected: EmailLogoExpectation,
): Promise<VerifiedEmailLogo> {
	assert(response.status === 200, `expected HTTP 200, received ${response.status}`);
	assert(isPngMediaType(response.headers.get("content-type")), "content type is not image/png");

	const bytes = new Uint8Array(await response.arrayBuffer());
	assert(bytes.byteLength === expected.byteLength, "byte length does not match the contract");
	const sha256 = createHash("sha256").update(bytes).digest("hex");
	assert(sha256 === expected.sha256, "SHA-256 digest does not match the contract");

	const header = readPngHeader(bytes);
	assert(header.width === expected.width, "PNG width does not match the contract");
	assert(header.height === expected.height, "PNG height does not match the contract");
	assert(header.bitDepth === expected.bitDepth, "PNG bit depth does not match the contract");
	assert(header.colorType === expected.colorType, "PNG color type does not match the contract");
	assert(header.compression === 0, "PNG compression method must be zero");
	assert(header.filter === 0, "PNG filter method must be zero");
	assert(header.interlace === 0, "PNG interlace method must be zero");

	return {
		url: expected.url,
		sha256,
		byteLength: bytes.byteLength,
		width: header.width,
		height: header.height,
	};
}

/** Fetch and validate the public logo specified by the published email contract. */
export async function verifyPublishedEmailLogo(
	fetchCall: typeof fetch = fetch,
): Promise<VerifiedEmailLogo> {
	const { logoSha256, logoUrl } = emailDesignContract.identity;
	const response = await fetchCall(logoUrl, {
		redirect: "error",
		signal: AbortSignal.timeout(15_000),
	});

	return verifyEmailLogoResponse(response, {
		url: logoUrl,
		sha256: logoSha256,
		byteLength: 90_469,
		width: 512,
		height: 512,
		bitDepth: 8,
		colorType: 6,
	});
}

if (import.meta.main) {
	const result = await verifyPublishedEmailLogo();
	console.log(
		JSON.stringify({
			byteLength: result.byteLength,
			height: result.height,
			sha256: result.sha256,
			url: result.url,
			width: result.width,
		}),
	);
}
