// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { create } from "storybook/theming";

export const resqDark = create({
	base: "dark",

	// Brand
	brandTitle: "ResQ UI",
	brandUrl: "https://github.com/resq-software/ui",

	// Colors — match globals.css dark theme (oklch source values)
	colorPrimary: "#e24b4a",
	colorSecondary: "#3b8fe8",

	// UI
	appBg: "#0b0d14",
	appContentBg: "#111520",
	appPreviewBg: "#0b0d14",
	appBorderColor: "#1e2438",
	appBorderRadius: 6,

	// Text
	textColor: "#f0f2fa",
	textInverseColor: "#0b0d14",
	textMutedColor: "#6d7b9c",

	// Toolbar & tabs
	barTextColor: "#8a9bb8",
	barSelectedColor: "#3b8fe8",
	barHoverColor: "#f0f2fa",
	barBg: "#111520",

	// Inputs
	inputBg: "#171c2b",
	inputBorder: "#1e2438",
	inputTextColor: "#f0f2fa",
	inputBorderRadius: 6,

	// Fonts
	fontBase: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
	fontCode: '"DM Mono", ui-monospace, "SFMono-Regular", monospace',

	// Booleans
	booleanBg: "#171c2b",
	booleanSelectedBg: "#3b8fe8",

	// Grid
	gridCellSize: 12,
});

export const resqLight = create({
	base: "light",

	// Brand
	brandTitle: "ResQ UI",
	brandUrl: "https://github.com/resq-software/ui",

	// Colors
	colorPrimary: "#e24b4a",
	colorSecondary: "#3b8fe8",

	// UI
	appBg: "#fafafa",
	appContentBg: "#f0f2f5",
	appPreviewBg: "#fafafa",
	appBorderColor: "#d2d9e6",
	appBorderRadius: 6,

	// Text
	textColor: "#0b0d14",
	textInverseColor: "#f0f2fa",
	textMutedColor: "#4a5470",

	// Toolbar & tabs
	barTextColor: "#4a5470",
	barSelectedColor: "#3b8fe8",
	barHoverColor: "#0b0d14",
	barBg: "#f0f2f5",

	// Inputs
	inputBg: "#e8eaf0",
	inputBorder: "#d2d9e6",
	inputTextColor: "#0b0d14",
	inputBorderRadius: 6,

	// Fonts
	fontBase: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
	fontCode: '"DM Mono", ui-monospace, "SFMono-Regular", monospace',

	// Booleans
	booleanBg: "#e8eaf0",
	booleanSelectedBg: "#3b8fe8",

	// Grid
	gridCellSize: 12,
});
