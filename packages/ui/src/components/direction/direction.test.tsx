// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DirectionProvider } from "./direction";

describe("DirectionProvider", () => {
	it("forwards `dir` to the underlying Radix provider", () => {
		const element = DirectionProvider({ dir: "rtl", children: null });
		// The component returns a Radix Direction.DirectionProvider with dir prop.
		expect(element.props.dir).toBe("rtl");
	});

	it("accepts the `direction` alias as a synonym for `dir`", () => {
		const element = DirectionProvider({ direction: "rtl", children: null });
		expect(element.props.dir).toBe("rtl");
	});

	it("prefers `direction` over `dir` when both are provided", () => {
		const element = DirectionProvider({
			dir: "ltr",
			direction: "rtl",
			children: null,
		});
		expect(element.props.dir).toBe("rtl");
	});

	it("renders children inside the provider", () => {
		const child = "marker";
		const element = DirectionProvider({ dir: "ltr", children: child });
		expect(element.props.children).toBe(child);
	});
});
