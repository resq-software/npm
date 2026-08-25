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
import { describe, expect, it } from "vitest";
import { verifyEmailLogoResponse } from "../scripts/verify-email-logo-asset";

const url = "https://resq.software/logo.png";

function pngBytes({
	width = 512,
	height = 512,
	bitDepth = 8,
	colorType = 6,
	compression = 0,
	filter = 0,
	interlace = 0,
}: {
	width?: number;
	height?: number;
	bitDepth?: number;
	colorType?: number;
	compression?: number;
	filter?: number;
	interlace?: number;
} = {}): Uint8Array {
	const bytes = new Uint8Array(33);
	bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
	new DataView(bytes.buffer).setUint32(8, 13);
	bytes.set([73, 72, 68, 82], 12);
	const view = new DataView(bytes.buffer);
	view.setUint32(16, width);
	view.setUint32(20, height);
	bytes[24] = bitDepth;
	bytes[25] = colorType;
	bytes[26] = compression;
	bytes[27] = filter;
	bytes[28] = interlace;
	return bytes;
}

function expectedFor(bytes: Uint8Array) {
	return {
		url,
		sha256: createHash("sha256").update(bytes).digest("hex"),
		byteLength: bytes.byteLength,
		width: 512,
		height: 512,
		bitDepth: 8,
		colorType: 6,
	};
}

function response(bytes: Uint8Array, init: ResponseInit = {}): Response {
	return new Response(bytes, {
		status: 200,
		headers: { "content-type": "image/png" },
		...init,
	});
}

describe("verifyEmailLogoResponse", () => {
	it("returns exact metadata for a matching PNG response", async () => {
		const bytes = pngBytes();
		const expected = expectedFor(bytes);

		await expect(verifyEmailLogoResponse(response(bytes), expected)).resolves.toEqual({
			url: "https://resq.software/logo.png",
			sha256: expected.sha256,
			byteLength: bytes.byteLength,
			width: 512,
			height: 512,
		});
	});

	it.each([
		["non-200 status", response(pngBytes(), { status: 201 })],
		[
			"non-PNG media type",
			response(pngBytes(), { headers: { "content-type": "application/octet-stream" } }),
		],
	])("rejects a %s", async (_name, candidate) => {
		const bytes = pngBytes();
		await expect(verifyEmailLogoResponse(candidate, expectedFor(bytes))).rejects.toThrow();
	});

	it.each([
		[
			"wrong byte count",
			pngBytes(),
			(expected: ReturnType<typeof expectedFor>) => ({
				...expected,
				byteLength: expected.byteLength + 1,
			}),
		],
		[
			"wrong digest",
			pngBytes(),
			(expected: ReturnType<typeof expectedFor>) => ({ ...expected, sha256: "0".repeat(64) }),
		],
		[
			"wrong width",
			pngBytes({ width: 511 }),
			(expected: ReturnType<typeof expectedFor>) => expected,
		],
		[
			"wrong height",
			pngBytes({ height: 511 }),
			(expected: ReturnType<typeof expectedFor>) => expected,
		],
		[
			"wrong bit depth",
			pngBytes({ bitDepth: 16 }),
			(expected: ReturnType<typeof expectedFor>) => expected,
		],
		[
			"non-RGBA color type",
			pngBytes({ colorType: 2 }),
			(expected: ReturnType<typeof expectedFor>) => expected,
		],
		[
			"nonzero compression",
			pngBytes({ compression: 1 }),
			(expected: ReturnType<typeof expectedFor>) => expected,
		],
		[
			"nonzero filter",
			pngBytes({ filter: 1 }),
			(expected: ReturnType<typeof expectedFor>) => expected,
		],
		[
			"nonzero interlace",
			pngBytes({ interlace: 1 }),
			(expected: ReturnType<typeof expectedFor>) => expected,
		],
	])("rejects %s", async (_name, bytes, expectedBuilder) => {
		await expect(
			verifyEmailLogoResponse(response(bytes), expectedBuilder(expectedFor(bytes))),
		).rejects.toThrow();
	});

	it("rejects a malformed PNG signature", async () => {
		const bytes = pngBytes();
		bytes[0] = 0;
		await expect(verifyEmailLogoResponse(response(bytes), expectedFor(bytes))).rejects.toThrow();
	});
});
