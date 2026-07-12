/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Toaster — themed wrapper around `sonner`'s
 * `<Toaster>`. Mount once at the root of the app; trigger
 * notifications via `import { toast } from "sonner"`.
 *
 * Theme resolution flows through `next-themes` so toasts
 * automatically follow the user's system / explicit theme
 * preference. Default Phosphor icons are wired for success /
 * error / info / warning / loading severity tiers, and design-token
 * CSS variables are forwarded so border, surface, and text colors
 * match the rest of the design system.
 */

"use client";

import {
	CheckCircleIcon,
	InfoIcon,
	SpinnerGapIcon,
	WarningIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			className="toaster group"
			icons={{
				error: <XCircleIcon weight="light" className="size-4" />,
				info: <InfoIcon weight="light" className="size-4" />,
				loading: <SpinnerGapIcon weight="light" className="size-4 animate-spin" />,
				success: <CheckCircleIcon weight="light" className="size-4" />,
				warning: <WarningIcon weight="light" className="size-4" />,
			}}
			style={
				{
					"--border-radius": "var(--radius)",
					"--normal-bg": "var(--popover)",
					"--normal-border": "var(--border)",
					"--normal-text": "var(--popover-foreground)",
				} as React.CSSProperties
			}
			theme={theme as ToasterProps["theme"]}
			toastOptions={{
				classNames: {
					toast: "cn-toast",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
