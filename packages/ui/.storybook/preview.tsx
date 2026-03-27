// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { DocsContainer, type DocsContainerProps } from "@storybook/addon-docs/blocks";
import type { Preview } from "@storybook/react";
import type { PropsWithChildren } from "react";
import React, { useEffect, useState } from "react";
import { GLOBALS_UPDATED } from "storybook/internal/core-events";

import { resqDark, resqLight } from "./theme";
import "../src/styles/globals.css";

function getInitialTheme(context: DocsContainerProps["context"]): boolean {
	// Try reading from story context first (component docs pages)
	try {
		const stories = context.componentStories();
		if (stories.length > 0) {
			const storyContext = context.getStoryContext(stories[0]);
			return storyContext.globals.theme !== "light";
		}
	} catch {
		// No stories available (pure MDX page)
	}
	// Fall back to URL params (works for pure MDX pages like Introduction)
	const params = new URLSearchParams(window.location.search);
	const globals = params.get("globals");
	if (globals?.includes("theme:light")) return false;
	return true;
}

function ThemedDocsContainer({ children, ...props }: PropsWithChildren<DocsContainerProps>) {
	const [isDark, setIsDark] = useState(() => getInitialTheme(props.context));

	useEffect(() => {
		const channel = props.context.channel;
		const onGlobalsUpdated = ({ globals }: { globals: Record<string, unknown> }) => {
			setIsDark(globals.theme !== "light");
		};
		channel.on(GLOBALS_UPDATED, onGlobalsUpdated);
		return () => channel.off(GLOBALS_UPDATED, onGlobalsUpdated);
	}, [props.context.channel]);

	return (
		<DocsContainer {...props} theme={isDark ? resqDark : resqLight}>
			{children}
		</DocsContainer>
	);
}

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
			container: ThemedDocsContainer,
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
