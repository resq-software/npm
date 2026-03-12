// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Preview } from "@storybook/nextjs";

import "../src/styles/globals.css";

const preview: Preview = {
	parameters: {
		backgrounds: {
			default: "light",
			values: [
				{ name: "light", value: "#ffffff" },
				{ name: "dark", value: "#09090b" },
			],
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /date$/i,
			},
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
