// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /date$/i,
			},
		},
	},
};

export default preview;
