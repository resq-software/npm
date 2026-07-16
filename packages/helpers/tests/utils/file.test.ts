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

import { describe, expect, it } from "vitest";
import { FileHelpers } from "../../src/utils/file.js";

describe("FileHelpers", () => {
	describe("urlToDataUrl", () => {
		it("should return data URL unchanged if already a data URL", async () => {
			const dataUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
			const result = await FileHelpers.urlToDataUrl(dataUrl);

			expect(result).toBe(dataUrl);
		});
	});

	describe("rewriteMimeType", () => {
		it("should return the same blob if MIME type matches", () => {
			const blob = new Blob(["content"], { type: "text/plain" });
			const result = FileHelpers.rewriteMimeType(blob, "text/plain");

			expect(result).toBe(blob);
		});

		it("should create new blob with different MIME type", () => {
			const blob = new Blob(["content"], { type: "text/plain" });
			const result = FileHelpers.rewriteMimeType(blob, "application/json");

			expect(result).not.toBe(blob);
			expect(result.type).toBe("application/json");
			expect(result.size).toBe(blob.size);
		});

		it("should return the same file if MIME type matches", () => {
			const file = new File(["content"], "test.txt", { type: "text/plain" });
			const result = FileHelpers.rewriteMimeType(file, "text/plain");

			expect(result).toBe(file);
		});

		it("should create new file with different MIME type and preserve name", () => {
			const file = new File(["content"], "test.txt", { type: "text/plain" });
			const result = FileHelpers.rewriteMimeType(file, "application/json") as File;

			expect(result).not.toBe(file);
			expect(result.type).toBe("application/json");
			expect(result.name).toBe("test.txt");
			expect(result.size).toBe(file.size);
			expect(result).toBeInstanceOf(File);
		});
	});
});
