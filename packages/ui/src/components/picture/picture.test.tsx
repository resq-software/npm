// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PictureInternal } from "./picture";

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
});
