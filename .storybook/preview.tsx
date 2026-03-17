// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Preview } from "@storybook/react";
import React, { useEffect } from "react";

import "../src/styles/globals.css";

const preview: Preview = {
	decorators: [
		(Story, context) => {
			const theme = context.globals.theme || "dark";
			useEffect(() => {
				const html = document.documentElement;
				html.classList.toggle("light", theme === "light");
			}, [theme]);

			return React.createElement(Story);
		},
	],
	globalTypes: {
		theme: {
			description: "Global theme for components",
			defaultValue: "dark",
			toolbar: {
				icon: "circlehollow",
				items: [
					{ value: "dark", icon: "circle", title: "Dark" },
					{ value: "light", icon: "circlehollow", title: "Light" },
				],
			},
		},
	},
	parameters: {
		layout: "centered",
		backgrounds: {
			default: "dark",
			values: [
				{ name: "dark", value: "oklch(16.04% 0.0152 272.20)" },
				{ name: "light", value: "oklch(98.51% 0 0)" },
			],
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /date$/i,
			},
		},
		docs: {
			toc: true,
		},
		viewport: {
			defaultViewport: "desktop",
			viewports: {
				desktop: {
					name: "Desktop",
					styles: { height: "900px", width: "1280px" },
					type: "desktop",
				},
				mobile: {
					name: "Mobile",
					styles: { height: "812px", width: "375px" },
					type: "mobile",
				},
				tablet: {
					name: "Tablet",
					styles: { height: "1024px", width: "768px" },
					type: "tablet",
				},
			},
		},
	},
};

export default preview;
