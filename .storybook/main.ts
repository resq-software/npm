// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
	addons: [
		"@github-ui/storybook-addon-performance-panel",
		"@storybook/addon-docs",
	],
	docs: {
		defaultName: "Docs",
		docsMode: true,
	},
	framework: {
		name: "@storybook/nextjs-vite",
		options: {},
	},
	stories: ["../src/**/*.stories.@(ts|tsx)"],
	async viteFinal(config) {
		const { mergeConfig } = await import("vite");
		const tailwindcss = (await import("@tailwindcss/vite")).default;

		return mergeConfig(config, {
			build: {
				chunkSizeWarningLimit: 2000,
				rollupOptions: {
					onwarn(warning, warn) {
						if (
							warning.code === "MODULE_LEVEL_DIRECTIVE" &&
							warning.message.includes("use client")
						) {
							return;
						}
						if (warning.code === "SOURCEMAP_ERROR") {
							return;
						}
						warn(warning);
					},
				},
			},
			plugins: [tailwindcss()],
		});
	},
};

export default config;
