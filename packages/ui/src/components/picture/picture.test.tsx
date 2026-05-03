// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PictureInternal } from "./picture";
import type { LqipEntry } from "./types";

const FAKE_LQIP_BASE64 =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const FAKE_LQIP_ENTRY: LqipEntry = {
	lqip: FAKE_LQIP_BASE64,
	path: "./assets/icons/png/test-icon.png",
	src: "test-icon",
	width: 16,
	height: 16,
};

describe("PictureInternal", () => {
	it("uses branded loading and frame treatment by default", () => {
		const html = renderToStaticMarkup(
			React.createElement(PictureInternal, {
				alt: "ResQ drone",
				src: "/drone.png",
			}),
		);

		expect(html).toContain("bg-surface");
		expect(html).toContain("border");
		expect(html).toContain("animate-pulse");
	});

	it("applies LQIP background when given a raw base64 string", () => {
		const html = renderToStaticMarkup(
			React.createElement(PictureInternal, {
				alt: "Placeholder test",
				src: "/photo.png",
				lqip: FAKE_LQIP_BASE64,
			}),
		);

		// LQIP replaces animate-pulse with a background-image
		expect(html).not.toContain("animate-pulse");
		expect(html).toContain("background-image");
		expect(html).toContain(FAKE_LQIP_BASE64);
	});

	it("applies LQIP background when given an LqipEntry object", () => {
		const html = renderToStaticMarkup(
			React.createElement(PictureInternal, {
				alt: "Registry entry test",
				src: "/icon.png",
				lqip: FAKE_LQIP_ENTRY,
			}),
		);

		expect(html).not.toContain("animate-pulse");
		expect(html).toContain("background-image");
		expect(html).toContain(FAKE_LQIP_BASE64);
	});

	it("does not apply LQIP background when lqip is undefined", () => {
		const html = renderToStaticMarkup(
			React.createElement(PictureInternal, {
				alt: "No LQIP",
				src: "/photo.png",
			}),
		);

		expect(html).not.toContain("background-image");
		expect(html).toContain("animate-pulse");
	});
});
