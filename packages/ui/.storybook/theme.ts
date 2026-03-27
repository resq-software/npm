// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { create } from "storybook/theming";

const shared = {
	brandTitle: "ResQ UI",
	brandUrl: "https://github.com/resq-software/ui",
	appBorderRadius: 6,
	inputBorderRadius: 6,
	gridCellSize: 12,
	fontBase: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
	fontCode: '"DM Mono", ui-monospace, "SFMono-Regular", monospace',
} as const;

export const resqDark = create({
	...shared,
	base: "dark",
	colorPrimary: "#e24b4a",
	colorSecondary: "#3b8fe8",
	appBg: "#0b0d14",
	appContentBg: "#111520",
	appPreviewBg: "#0b0d14",
	appBorderColor: "#1e2438",
	textColor: "#f0f2fa",
	textInverseColor: "#0b0d14",
	textMutedColor: "#6d7b9c",
	barTextColor: "#8a9bb8",
	barSelectedColor: "#3b8fe8",
	barHoverColor: "#f0f2fa",
	barBg: "#111520",
	inputBg: "#171c2b",
	inputBorder: "#1e2438",
	inputTextColor: "#f0f2fa",
	booleanBg: "#171c2b",
	booleanSelectedBg: "#3b8fe8",
});

export const resqLight = create({
	...shared,
	base: "light",
	colorPrimary: "#e24b4a",
	colorSecondary: "#3b8fe8",
	appBg: "#f9fafb",
	appContentBg: "#ffffff",
	appPreviewBg: "#f9fafb",
	appBorderColor: "#d8dce6",
	textColor: "#0b0d14",
	textInverseColor: "#f0f2fa",
	textMutedColor: "#596680",
	barTextColor: "#596680",
	barSelectedColor: "#3b8fe8",
	barHoverColor: "#0b0d14",
	barBg: "#ffffff",
	inputBg: "#f0f2f5",
	inputBorder: "#d8dce6",
	inputTextColor: "#0b0d14",
	booleanBg: "#f0f2f5",
	booleanSelectedBg: "#3b8fe8",
});
